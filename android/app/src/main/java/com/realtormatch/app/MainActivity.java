package com.realtormatch.app;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(android.os.Bundle savedInstanceState) {
        // Регистрируем CallLogPlugin и SocialSharePlugin до вызова super.onCreate()
        registerPlugin(CallLogPlugin.class);
        registerPlugin(SocialSharePlugin.class);
        super.onCreate(savedInstanceState);
    }
}
