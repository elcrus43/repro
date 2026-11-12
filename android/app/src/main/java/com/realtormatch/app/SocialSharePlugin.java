package com.realtormatch.app;

import android.content.ClipData;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.util.Base64;

import androidx.core.content.FileProvider;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.File;
import java.io.FileOutputStream;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;

/**
 * SocialSharePlugin - нативный Capacitor-плагин для отправки PNG-баннера в соцсети (Stories / Статус).
 */
@CapacitorPlugin(name = "SocialSharePlugin")
public class SocialSharePlugin extends Plugin {

    private static List<String> getCandidatePackages(String network) {
        switch (network) {
            case "vk":
                return Arrays.asList("com.vkontakte.android", "com.vk.im");
            case "ok":
                return Collections.singletonList("ru.ok.android");
            case "tg":
                return Arrays.asList("org.telegram.messenger", "org.telegram.messenger.web");
            case "instagram":
                return Collections.singletonList("com.instagram.android");
            case "whatsapp":
                return Arrays.asList("com.whatsapp", "com.whatsapp.w4b");
            default:
                return Collections.emptyList();
        }
    }

    @PluginMethod
    public void shareToStory(PluginCall call) {
        String network = call.getString("network", "");
        String imageBase64 = call.getString("imageBase64", "");
        String rawFileName = call.getString("fileName", "banner.png");
        String caption = call.getString("caption", "");

        if (imageBase64 == null || imageBase64.isEmpty()) {
            call.reject("Пустое изображение баннера");
            return;
        }

        try {
            String pureBase64 = imageBase64;
            int commaIdx = imageBase64.indexOf(',');
            if (commaIdx >= 0) {
                pureBase64 = imageBase64.substring(commaIdx + 1);
            }

            byte[] bytes = Base64.decode(pureBase64, Base64.DEFAULT);
            String safeName = (rawFileName == null || rawFileName.isEmpty())
                ? "banner.png"
                : rawFileName.replaceAll("[^a-zA-Z0-9._-]", "_");

            File cacheDir = new File(getContext().getCacheDir(), "shared_banners");
            if (!cacheDir.exists()) {
                cacheDir.mkdirs();
            }
            File outFile = new File(cacheDir, safeName);
            try (FileOutputStream fos = new FileOutputStream(outFile)) {
                fos.write(bytes);
                fos.flush();
            }

            String authority = getContext().getPackageName() + ".fileprovider";
            Uri contentUri = FileProvider.getUriForFile(getContext(), authority, outFile);
            PackageManager pm = getContext().getPackageManager();

            // Специальный Intent для прямого открытия редактора Instagram Stories
            if ("instagram".equals(network)) {
                Intent storyIntent = new Intent("com.instagram.share.ADD_TO_STORY");
                storyIntent.setDataAndType(contentUri, "image/png");
                storyIntent.setFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_ACTIVITY_NEW_TASK);
                if (pm.resolveActivity(storyIntent, 0) != null) {
                    getContext().grantUriPermission(
                        "com.instagram.android",
                        contentUri,
                        Intent.FLAG_GRANT_READ_URI_PERMISSION
                    );
                    getActivity().startActivity(storyIntent);
                    JSObject res = new JSObject();
                    res.put("ok", true);
                    res.put("method", "instagram_story");
                    call.resolve(res);
                    return;
                }
            }

            List<String> candidates = getCandidatePackages(network);
            for (String pkg : candidates) {
                Intent targeted = new Intent(Intent.ACTION_SEND);
                targeted.setType("image/png");
                targeted.putExtra(Intent.EXTRA_STREAM, contentUri);
                if (caption != null && !caption.isEmpty()) {
                    targeted.putExtra(Intent.EXTRA_TEXT, caption);
                }
                targeted.setPackage(pkg);
                targeted.setClipData(ClipData.newRawUri("", contentUri));
                targeted.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_ACTIVITY_NEW_TASK);

                if (pm.resolveActivity(targeted, 0) != null) {
                    getContext().grantUriPermission(pkg, contentUri, Intent.FLAG_GRANT_READ_URI_PERMISSION);
                    getActivity().startActivity(targeted);
                    JSObject res = new JSObject();
                    res.put("ok", true);
                    res.put("method", "android_app");
                    res.put("package", pkg);
                    call.resolve(res);
                    return;
                }
            }

            // Фолбэк на системное окно выбора приложения
            Intent fallback = new Intent(Intent.ACTION_SEND);
            fallback.setType("image/png");
            fallback.putExtra(Intent.EXTRA_STREAM, contentUri);
            if (caption != null && !caption.isEmpty()) {
                fallback.putExtra(Intent.EXTRA_TEXT, caption);
            }
            fallback.setClipData(ClipData.newRawUri("", contentUri));
            fallback.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);

            Intent chooser = Intent.createChooser(fallback, "Отправить баннер");
            chooser.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_GRANT_READ_URI_PERMISSION);
            getActivity().startActivity(chooser);

            JSObject res = new JSObject();
            res.put("ok", true);
            res.put("method", "android_chooser");
            call.resolve(res);
        } catch (Exception e) {
            call.reject("Не удалось отправить баннер: " + e.getMessage());
        }
    }
}
