package mg.malawy.openup;

import android.Manifest;
import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import com.google.firebase.messaging.FirebaseMessaging;
import org.json.JSONObject;

public class MainActivity extends Activity {
    private static final String HOME = "https://malawy-open-up.briramamonjisoa.workers.dev";
    private static final int FILE_CHOOSER_REQUEST = 501;
    private static final int NOTIFICATION_PERMISSION_REQUEST = 502;
    private WebView webView;
    private ValueCallback<Uri[]> fileCallback;

    public class MalawyBridge {
        @JavascriptInterface
        public void requestFcmToken() {
            FirebaseMessaging.getInstance().getToken().addOnCompleteListener(task -> {
                if (!task.isSuccessful() || webView == null) return;
                String token = task.getResult();
                runOnUiThread(() -> {
                    if (webView == null) return;
                    webView.evaluateJavascript(
                        "window.dispatchEvent(new CustomEvent('mou:fcm-token',{detail:" + JSONObject.quote(token) + "}));",
                        null
                    );
                });
            });
        }
    }

    @Override public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().setStatusBarColor(android.graphics.Color.rgb(13,20,40));
        getWindow().setNavigationBarColor(android.graphics.Color.rgb(13,20,40));
        webView = new WebView(this);
        webView.setBackgroundColor(android.graphics.Color.rgb(13,20,40));
        webView.getSettings().setJavaScriptEnabled(true);
        webView.getSettings().setDomStorageEnabled(true);
        webView.getSettings().setAllowFileAccess(true);
        webView.getSettings().setMediaPlaybackRequiresUserGesture(true);
        webView.addJavascriptInterface(new MalawyBridge(), "MalawyAndroid");
        webView.setWebViewClient(new WebViewClient() {
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) { return false; }
        });
        webView.setWebChromeClient(new WebChromeClient() {
            @Override public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback, FileChooserParams params) {
                if (fileCallback != null) fileCallback.onReceiveValue(null);
                fileCallback = callback;
                Intent intent = params.createIntent();
                try { startActivityForResult(intent, FILE_CHOOSER_REQUEST); }
                catch (ActivityNotFoundException e) { fileCallback = null; return false; }
                return true;
            }
        });
        setContentView(webView);
        if (savedInstanceState == null) webView.loadUrl(HOME); else webView.restoreState(savedInstanceState);
        requestNotificationPermission();
        handleNotificationIntent(getIntent());
    }

    private void requestNotificationPermission() {
        if (Build.VERSION.SDK_INT >= 33 &&
            ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
            ActivityCompat.requestPermissions(this, new String[]{Manifest.permission.POST_NOTIFICATIONS}, NOTIFICATION_PERMISSION_REQUEST);
        }
    }

    private void handleNotificationIntent(Intent intent) {
        if (intent == null || webView == null) return;
        String path = intent.getStringExtra("mou_url");
        if (path != null && !path.isEmpty()) {
            String safePath = path.startsWith("/") ? path : "/";
            webView.post(() -> webView.evaluateJavascript("window.location.href=" + JSONObject.quote(HOME + safePath) + ";", null));
            intent.removeExtra("mou_url");
        }
    }

    @Override protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        handleNotificationIntent(intent);
    }

    @Override protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == FILE_CHOOSER_REQUEST && fileCallback != null) {
            Uri[] results = WebChromeClient.FileChooserParams.parseResult(resultCode, data);
            fileCallback.onReceiveValue(results);
            fileCallback = null;
        }
    }

    @Override protected void onSaveInstanceState(Bundle outState) {
        super.onSaveInstanceState(outState);
        if (webView != null) webView.saveState(outState);
    }

    @Override public void onBackPressed() {
        if (webView != null && webView.canGoBack()) webView.goBack(); else super.onBackPressed();
    }

    @Override protected void onDestroy() {
        if (webView != null) {
            webView.removeJavascriptInterface("MalawyAndroid");
            webView.destroy();
            webView = null;
        }
        super.onDestroy();
    }
}
