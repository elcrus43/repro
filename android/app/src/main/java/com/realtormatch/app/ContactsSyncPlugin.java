package com.realtormatch.app;

import android.Manifest;
import android.accounts.Account;
import android.accounts.AccountManager;
import android.content.ContentProviderOperation;
import android.content.ContentResolver;
import android.database.Cursor;
import android.net.Uri;
import android.provider.ContactsContract;
import android.util.Log;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

import org.json.JSONException;

import java.util.ArrayList;

/**
 * ContactsSyncPlugin - нативный Capacitor-плагин для синхронизации клиентов с адресной книгой Android.
 *
 * Созданные контакты связываются с Google-аккаунтом устройства (com.google),
 * благодаря чему Android автоматически выгружает их в Google Контакты (cloud).
 */
@CapacitorPlugin(
    name = "ContactsSyncPlugin",
    permissions = {
        @Permission(
            alias = "contacts",
            strings = {
                Manifest.permission.READ_CONTACTS,
                Manifest.permission.WRITE_CONTACTS
            }
        )
    }
)
public class ContactsSyncPlugin extends Plugin {

    private static final String TAG = "ContactsSyncPlugin";

    /**
     * Запросить разрешение на доступ к контактам (READ_CONTACTS + WRITE_CONTACTS).
     */
    @PluginMethod
    public void requestPermission(PluginCall call) {
        if (getPermissionState("contacts") == com.getcapacitor.PermissionState.GRANTED) {
            JSObject result = new JSObject();
            result.put("granted", true);
            call.resolve(result);
        } else {
            requestPermissionForAlias("contacts", call, "contactsPermissionCallback");
        }
    }

    @PermissionCallback
    private void contactsPermissionCallback(PluginCall call) {
        boolean granted = getPermissionState("contacts") == com.getcapacitor.PermissionState.GRANTED;
        JSObject result = new JSObject();
        result.put("granted", granted);
        call.resolve(result);
    }

    /**
     * Проверить текущий статус разрешения.
     */
    @PluginMethod
    public void checkPermission(PluginCall call) {
        boolean granted = getPermissionState("contacts") == com.getcapacitor.PermissionState.GRANTED;
        JSObject result = new JSObject();
        result.put("granted", granted);
        call.resolve(result);
    }

    /**
     * Сохранить одного клиента в контакты устройства / Google.
     *
     * Параметры:
     *   name          - ФИО контакта
     *   phone         - номер телефона
     *   email         - email (опционально)
     *   organization  - организация / пометка (по умолчанию REA CRM)
     *   jobTitle      - роль / категория (например: Покупатель, Продавец)
     *   note          - заметка (бюджет, параметры запроса и т.д.)
     *   checkDuplicate - проверять ли существование по номеру (по умолчанию true)
     */
    @PluginMethod
    public void saveContact(PluginCall call) {
        if (getPermissionState("contacts") != com.getcapacitor.PermissionState.GRANTED) {
            call.reject("Permission READ_CONTACTS / WRITE_CONTACTS not granted");
            return;
        }

        String name = call.getString("name", "");
        String phone = call.getString("phone", "");
        String email = call.getString("email", "");
        String organization = call.getString("organization", "REA CRM");
        String jobTitle = call.getString("jobTitle", "");
        String note = call.getString("note", "");
        boolean checkDuplicate = call.getBoolean("checkDuplicate", true);

        if ((name == null || name.trim().isEmpty()) && (phone == null || phone.trim().isEmpty())) {
            call.reject("Имя или телефон обязательны для сохранения контакта");
            return;
        }

        try {
            if (checkDuplicate && phone != null && !phone.trim().isEmpty()) {
                if (isPhoneExists(phone.trim())) {
                    JSObject res = new JSObject();
                    res.put("success", true);
                    res.put("alreadyExists", true);
                    res.put("message", "Контакт с таким номером уже есть в телефонной книге");
                    call.resolve(res);
                    return;
                }
            }

            String googleAccount = insertContact(name, phone, email, organization, jobTitle, note);

            JSObject res = new JSObject();
            res.put("success", true);
            res.put("alreadyExists", false);
            res.put("googleAccount", googleAccount);
            call.resolve(res);
        } catch (Exception e) {
            Log.e(TAG, "Error saving contact: " + e.getMessage(), e);
            call.reject("Ошибка при сохранении контакта: " + e.getMessage());
        }
    }

    /**
     * Пакетная синхронизация списка клиентов.
     *
     * Параметры:
     *   clients - массив объектов { name, phone, email, organization, jobTitle, note }
     */
    @PluginMethod
    public void syncClients(PluginCall call) {
        if (getPermissionState("contacts") != com.getcapacitor.PermissionState.GRANTED) {
            call.reject("Permission READ_CONTACTS / WRITE_CONTACTS not granted");
            return;
        }

        JSArray clients = call.getArray("clients");
        if (clients == null || clients.length() == 0) {
            JSObject res = new JSObject();
            res.put("total", 0);
            res.put("saved", 0);
            res.put("skipped", 0);
            res.put("errors", 0);
            call.resolve(res);
            return;
        }

        int total = clients.length();
        int saved = 0;
        int skipped = 0;
        int errors = 0;
        String googleAccount = null;

        for (int i = 0; i < total; i++) {
            try {
                org.json.JSONObject c = clients.getJSONObject(i);
                String name = c.optString("name", "");
                String phone = c.optString("phone", "");
                String email = c.optString("email", "");
                String orgName = c.optString("organization", "REA CRM");
                String jobTitle = c.optString("jobTitle", "");
                String note = c.optString("note", "");

                if (phone != null && !phone.trim().isEmpty()) {
                    if (isPhoneExists(phone.trim())) {
                        skipped++;
                        continue;
                    }
                }

                googleAccount = insertContact(name, phone, email, orgName, jobTitle, note);
                saved++;
            } catch (Exception e) {
                Log.w(TAG, "Error sync item at index " + i + ": " + e.getMessage());
                errors++;
            }
        }

        JSObject res = new JSObject();
        res.put("total", total);
        res.put("saved", saved);
        res.put("skipped", skipped);
        res.put("errors", errors);
        res.put("googleAccount", googleAccount);
        call.resolve(res);
    }

    /**
     * Проверить, существует ли номер в контактах Android.
     */
    private boolean isPhoneExists(String phone) {
        if (phone == null || phone.trim().isEmpty()) return false;
        Cursor cursor = null;
        try {
            Uri uri = Uri.withAppendedPath(ContactsContract.PhoneLookup.CONTENT_FILTER_URI, Uri.encode(phone.trim()));
            String[] projection = new String[]{ ContactsContract.PhoneLookup._ID, ContactsContract.PhoneLookup.DISPLAY_NAME };
            cursor = getContext().getContentResolver().query(uri, projection, null, null, null);
            if (cursor != null && cursor.moveToFirst()) {
                return true;
            }
        } catch (Exception e) {
            Log.w(TAG, "isPhoneExists error: " + e.getMessage());
        } finally {
            if (cursor != null) {
                cursor.close();
            }
        }
        return false;
    }

    /**
     * Создает контакт и связывает его с Google-аккаунтом устройства при наличии.
     * Возвращает имя Google-аккаунта или null, если использован локальный аккаунт устройства.
     */
    private String insertContact(String name, String phone, String email, String organization, String jobTitle, String note) throws Exception {
        String accountName = null;
        String accountType = null;

        try {
            AccountManager accountManager = AccountManager.get(getContext());
            Account[] accounts = accountManager.getAccountsByType("com.google");
            if (accounts != null && accounts.length > 0) {
                accountName = accounts[0].name;
                accountType = accounts[0].type;
            }
        } catch (Exception e) {
            Log.w(TAG, "Could not query Google account: " + e.getMessage());
        }

        ArrayList<ContentProviderOperation> ops = new ArrayList<>();
        int rawContactInsertIndex = ops.size();

        ContentProviderOperation.Builder rawContactOp = ContentProviderOperation.newInsert(ContactsContract.RawContacts.CONTENT_URI);
        if (accountName != null && accountType != null) {
            rawContactOp.withValue(ContactsContract.RawContacts.ACCOUNT_TYPE, accountType)
                        .withValue(ContactsContract.RawContacts.ACCOUNT_NAME, accountName);
        } else {
            rawContactOp.withValue(ContactsContract.RawContacts.ACCOUNT_TYPE, null)
                        .withValue(ContactsContract.RawContacts.ACCOUNT_NAME, null);
        }
        ops.add(rawContactOp.build());

        // Structured Display Name
        if (name != null && !name.trim().isEmpty()) {
            ops.add(ContentProviderOperation.newInsert(ContactsContract.Data.CONTENT_URI)
                .withValueBackReference(ContactsContract.Data.RAW_CONTACT_ID, rawContactInsertIndex)
                .withValue(ContactsContract.Data.MIMETYPE, ContactsContract.CommonDataKinds.StructuredName.CONTENT_ITEM_TYPE)
                .withValue(ContactsContract.CommonDataKinds.StructuredName.DISPLAY_NAME, name.trim())
                .build());
        }

        // Phone Number
        if (phone != null && !phone.trim().isEmpty()) {
            ops.add(ContentProviderOperation.newInsert(ContactsContract.Data.CONTENT_URI)
                .withValueBackReference(ContactsContract.Data.RAW_CONTACT_ID, rawContactInsertIndex)
                .withValue(ContactsContract.Data.MIMETYPE, ContactsContract.CommonDataKinds.Phone.CONTENT_ITEM_TYPE)
                .withValue(ContactsContract.CommonDataKinds.Phone.NUMBER, phone.trim())
                .withValue(ContactsContract.CommonDataKinds.Phone.TYPE, ContactsContract.CommonDataKinds.Phone.TYPE_MOBILE)
                .build());
        }

        // Email
        if (email != null && !email.trim().isEmpty()) {
            ops.add(ContentProviderOperation.newInsert(ContactsContract.Data.CONTENT_URI)
                .withValueBackReference(ContactsContract.Data.RAW_CONTACT_ID, rawContactInsertIndex)
                .withValue(ContactsContract.Data.MIMETYPE, ContactsContract.CommonDataKinds.Email.CONTENT_ITEM_TYPE)
                .withValue(ContactsContract.CommonDataKinds.Email.DATA, email.trim())
                .withValue(ContactsContract.CommonDataKinds.Email.TYPE, ContactsContract.CommonDataKinds.Email.TYPE_WORK)
                .build());
        }

        // Organization & Title
        if ((organization != null && !organization.trim().isEmpty()) || (jobTitle != null && !jobTitle.trim().isEmpty())) {
            ContentProviderOperation.Builder orgOp = ContentProviderOperation.newInsert(ContactsContract.Data.CONTENT_URI)
                .withValueBackReference(ContactsContract.Data.RAW_CONTACT_ID, rawContactInsertIndex)
                .withValue(ContactsContract.Data.MIMETYPE, ContactsContract.CommonDataKinds.Organization.CONTENT_ITEM_TYPE);
            if (organization != null && !organization.trim().isEmpty()) {
                orgOp.withValue(ContactsContract.CommonDataKinds.Organization.COMPANY, organization.trim());
            }
            if (jobTitle != null && !jobTitle.trim().isEmpty()) {
                orgOp.withValue(ContactsContract.CommonDataKinds.Organization.TITLE, jobTitle.trim());
            }
            ops.add(orgOp.build());
        }

        // Note
        if (note != null && !note.trim().isEmpty()) {
            ops.add(ContentProviderOperation.newInsert(ContactsContract.Data.CONTENT_URI)
                .withValueBackReference(ContactsContract.Data.RAW_CONTACT_ID, rawContactInsertIndex)
                .withValue(ContactsContract.Data.MIMETYPE, ContactsContract.CommonDataKinds.Note.CONTENT_ITEM_TYPE)
                .withValue(ContactsContract.CommonDataKinds.Note.NOTE, note.trim())
                .build());
        }

        getContext().getContentResolver().applyBatch(ContactsContract.AUTHORITY, ops);
        return accountName;
    }
}
