package com.realtormatch.app;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(android.os.Bundle savedInstanceState) {
        // Регистрируем CallLogPlugin, SocialSharePlugin и ContactsSyncPlugin до вызова super.onCreate()
        registerPlugin(CallLogPlugin.class);
        registerPlugin(SocialSharePlugin.class);
        registerPlugin(ContactsSyncPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
