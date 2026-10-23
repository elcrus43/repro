package com.realtormatch.app;

import android.Manifest;
import android.content.ContentResolver;
import android.database.Cursor;
import android.provider.CallLog;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

/**
 * CallLogPlugin — Capacitor-плагин для чтения истории звонков Android.
 *
 * JS-API:
 *   CallLogPlugin.requestPermission() → { granted: boolean }
 *   CallLogPlugin.getCallLog({ sinceTimestamp, limit }) → { calls: [...] }
 *
 * Поля каждого звонка:
 *   number       — номер телефона (строка)
 *   type         — 1=входящий, 2=исходящий, 3=пропущенный
 *   date         — timestamp в мс (Date.now() формат)
 *   duration     — длительность в секундах
 *   name         — имя из контактов (может быть пустым)
 */
@CapacitorPlugin(
    name = "CallLogPlugin",
    permissions = {
        @Permission(
            alias = "readCallLog",
            strings = { Manifest.permission.READ_CALL_LOG }
        )
    }
)
public class CallLogPlugin extends Plugin {

    /** Запросить разрешение READ_CALL_LOG */
    @PluginMethod
    public void requestPermission(PluginCall call) {
        if (getPermissionState("readCallLog") == com.getcapacitor.PermissionState.GRANTED) {
            JSObject result = new JSObject();
            result.put("granted", true);
            call.resolve(result);
        } else {
            requestPermissionForAlias("readCallLog", call, "callLogPermissionCallback");
        }
    }

    @PermissionCallback
    private void callLogPermissionCallback(PluginCall call) {
        boolean granted = getPermissionState("readCallLog") == com.getcapacitor.PermissionState.GRANTED;
        JSObject result = new JSObject();
        result.put("granted", granted);
        call.resolve(result);
    }

    /**
     * Читает историю звонков.
     *
     * @param sinceTimestamp  — читать только звонки после этого timestamp (мс).
     *                          Если 0 — читать всё (ограничено limit).
     * @param limit           — максимальное кол-во записей (по умолчанию 200).
     */
    @PluginMethod
    public void getCallLog(PluginCall call) {
        if (getPermissionState("readCallLog") != com.getcapacitor.PermissionState.GRANTED) {
            call.reject("Permission READ_CALL_LOG not granted");
            return;
        }

        long sinceTimestamp = call.getLong("sinceTimestamp", 0L);
        int limit = call.getInt("limit", 200);

        try {
            JSArray calls = new JSArray();
            ContentResolver cr = getContext().getContentResolver();

            String selection = sinceTimestamp > 0
                ? CallLog.Calls.DATE + " > ?"
                : null;
            String[] selectionArgs = sinceTimestamp > 0
                ? new String[]{ String.valueOf(sinceTimestamp) }
                : null;

            String sortOrder = CallLog.Calls.DATE + " DESC LIMIT " + limit;

            String[] projection = {
                CallLog.Calls.NUMBER,
                CallLog.Calls.TYPE,
                CallLog.Calls.DATE,
                CallLog.Calls.DURATION,
                CallLog.Calls.CACHED_NAME
            };

            Cursor cursor = cr.query(
                CallLog.Calls.CONTENT_URI,
                projection,
                selection,
                selectionArgs,
                sortOrder
            );

            if (cursor != null) {
                int colNumber   = cursor.getColumnIndex(CallLog.Calls.NUMBER);
                int colType     = cursor.getColumnIndex(CallLog.Calls.TYPE);
                int colDate     = cursor.getColumnIndex(CallLog.Calls.DATE);
                int colDuration = cursor.getColumnIndex(CallLog.Calls.DURATION);
                int colName     = cursor.getColumnIndex(CallLog.Calls.CACHED_NAME);

                while (cursor.moveToNext()) {
                    JSObject item = new JSObject();
                    item.put("number",   cursor.getString(colNumber) != null ? cursor.getString(colNumber) : "");
                    item.put("type",     cursor.getInt(colType));      // 1=in, 2=out, 3=missed
                    item.put("date",     cursor.getLong(colDate));     // ms timestamp
                    item.put("duration", cursor.getLong(colDuration)); // seconds
                    item.put("name",     cursor.getString(colName) != null ? cursor.getString(colName) : "");
                    calls.put(item);
                }
                cursor.close();
            }

            JSObject result = new JSObject();
            result.put("calls", calls);
            call.resolve(result);

        } catch (Exception e) {
            call.reject("Failed to read call log: " + e.getMessage());
        }
    }
}
