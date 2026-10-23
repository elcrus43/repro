package com.realtormatch.app;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(android.os.Bundle savedInstanceState) {
        // Регистрируем CallLogPlugin до вызова super.onCreate()
        registerPlugin(CallLogPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
