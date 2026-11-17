package mg.malawy.openup;

import android.Manifest;
import android.app.Activity;
import android.app.AlertDialog;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.ConnectivityManager;
import android.net.Network;
import android.net.NetworkCapabilities;
import android.net.NetworkRequest;
import android.net.Uri;
import java.net.HttpURLConnection;
import java.net.URL;
import java.io.BufferedReader;
import java.io.InputStreamReader;
import android.os.Build;
import android.os.Bundle;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import com.google.firebase.messaging.FirebaseMessaging;
import org.json.JSONObject;

public class MainActivity extends Activity {
    private static final String HOME = "https://malawy-open-up.briramamonjisoa.workers.dev";
    private static final String VERSION_URL = HOME + "/app-version.json";
    private static final String APK_URL = "https://github.com/briramamonjisoa-oss/malawy-open-up/releases/latest/download/app-debug.apk";
    private boolean updateDialogVisible = false;
    private static final int FILE_CHOOSER_REQUEST = 501;
    private static final int NOTIFICATION_PERMISSION_REQUEST = 502;

    private WebView webView;
    private ValueCallback<Uri[]> fileCallback;
    private ConnectivityManager connectivityManager;
    private ConnectivityManager.NetworkCallback networkCallback;
    private boolean offlineScreenVisible = false;
    private boolean networkCallbackRegistered = false;

    private static final String OFFLINE_HTML =
        "<!doctype html><html lang='fr'><head><meta charset='utf-8'>" +
        "<meta name='viewport' content='width=device-width,initial-scale=1,viewport-fit=cover'>" +
        "<meta name='theme-color' content='#050506'><title>MALAWY OPEN UP</title><style>" +
        "*{box-sizing:border-box}html,body{margin:0;min-height:100%;background:#050506;color:#f3eee3;font-family:Arial,sans-serif}" +
        "body{min-height:100vh;display:grid;place-items:center}.splash{display:flex;flex-direction:column;align-items:center;gap:18px;text-align:center;padding:28px}" +
        ".mark{width:82px;height:82px;border:1px solid #bda66f;border-radius:19px;background:#111;color:#d8c18a;display:grid;place-items:center;font-size:56px;font-weight:900}" +
        ".name{font-size:19px;letter-spacing:.16em;font-weight:800}.sub{font-size:10px;letter-spacing:.3em;color:#ad9d79}" +
        ".status{margin-top:14px;color:#b9b2a5;font-size:14px}.retry{margin-top:12px;padding:13px 24px;border:1px solid #bda66f;border-radius:12px;background:#171512;color:#e8d6aa;font-size:15px;font-weight:700}" +
        ".retry:disabled{opacity:.35}.hint{font-size:12px;color:#817b70;max-width:260px;line-height:1.6}" +
        "</style></head><body><main class='splash'><div class='mark'>M</div><div class='name'>MALAWY OPEN UP</div>" +
        "<div class='sub'>FREE FIRE COMMUNITY</div><div class='status' id='status'>Vérifiez votre connexion Internet.</div>" +
        "<button class='retry' id='retry' disabled onclick='window.MalawyAndroid.retryConnection()'>Réessayer</button>" +
        "<div class='hint'>Les fonctionnalités sont indisponibles sans connexion Internet.</div></main>" +
        "<script>window.setOnline=function(v){var b=document.getElementById('retry');b.disabled=!v;document.getElementById('status').textContent=v?'Connexion disponible. Tu peux réessayer.':'Vérifiez votre connexion Internet.';};</script>" +
        "</body></html>";

    public class MalawyBridge {
        @JavascriptInterface
        public void requestFcmToken() {
            FirebaseMessaging.getInstance().getToken().addOnCompleteListener(task -> {
                if (!task.isSuccessful() || webView == null) return;
                String token = task.getResult();
                runOnUiThread(() -> {
                    if (webView == null || offlineScreenVisible) return;
                    webView.evaluateJavascript(
                        "window.dispatchEvent(new CustomEvent('mou:fcm-token',{detail:" + JSONObject.quote(token) + "}));",
                        null
                    );
                });
            });
        }

        @JavascriptInterface
        public void retryConnection() {
            runOnUiThread(() -> {
                if (hasValidatedInternet() && webView != null) {
                    offlineScreenVisible = false;
                    webView.loadUrl(HOME);
                } else {
                    updateOfflineRetryState();
                }
            });
        }
    }


    private int getInstalledVersionCode() {
        try {
            android.content.pm.PackageInfo info = getPackageManager().getPackageInfo(getPackageName(), 0);
            if (Build.VERSION.SDK_INT >= 28) return (int) info.getLongVersionCode();
            return info.versionCode;
        } catch (Exception error) {
            return 0;
        }
    }

    private void checkForUpdate() {
        new Thread(() -> {
            HttpURLConnection connection = null;
            try {
                connection = (HttpURLConnection) new URL(VERSION_URL + "?t=" + System.currentTimeMillis()).openConnection();
                connection.setConnectTimeout(7000);
                connection.setReadTimeout(7000);
                connection.setRequestMethod("GET");
                connection.setUseCaches(false);
                StringBuilder json = new StringBuilder();
                try (BufferedReader reader = new BufferedReader(new InputStreamReader(connection.getInputStream(), "UTF-8"))) {
                    String line;
                    while ((line = reader.readLine()) != null) json.append(line);
                }
                JSONObject version = new JSONObject(json.toString());
                int installedCode = getInstalledVersionCode();
                int latestCode = version.optInt("latestVersionCode", installedCode);
                String latestName = version.optString("latestVersionName", "");
                boolean force = version.optBoolean("forceUpdate", false);
                if (latestCode > installedCode) runOnUiThread(() -> showUpdateDialog(latestName, force));
            } catch (Exception error) {
                android.util.Log.w("MALAWY_UPDATE", "Version check unavailable", error);
            } finally {
                if (connection != null) connection.disconnect();
            }
        }).start();
    }

    private void showUpdateDialog(String versionName, boolean force) {
        if (isFinishing() || updateDialogVisible) return;
        updateDialogVisible = true;
        AlertDialog dialog = new AlertDialog.Builder(this)
            .setTitle("Nouvelle version disponible")
            .setMessage("MALAWY OPEN UP " + versionName + " est disponible. " +
                (force ? "Cette mise à jour est obligatoire pour continuer." : "Installe la mise à jour pour profiter des nouveautés."))
            .setCancelable(!force)
            .setPositiveButton("Télécharger la mise à jour", (d, which) -> downloadUpdate())
            .setNegativeButton(force ? "Quitter" : "Plus tard", (d, which) -> { updateDialogVisible = false; if (force) finish(); })
            .create();
        dialog.setOnDismissListener(d -> updateDialogVisible = false);
        dialog.show();
    }

    private void downloadUpdate() {
        try {
            Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(APK_URL));
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            startActivity(intent);
        } catch (Exception error) {
            new AlertDialog.Builder(this).setTitle("Téléchargement impossible")
                .setMessage("Ouvre le lien de mise à jour depuis ton navigateur : " + APK_URL)
                .setPositiveButton("OK", null).show();
        }
    }

    private boolean hasValidatedInternet() {
        try {
            if (connectivityManager == null) {
                connectivityManager = (ConnectivityManager) getSystemService(CONNECTIVITY_SERVICE);
            }
            Network network = connectivityManager.getActiveNetwork();
            if (network == null) return false;
            NetworkCapabilities caps = connectivityManager.getNetworkCapabilities(network);
            return caps != null
                && caps.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
                && caps.hasCapability(NetworkCapabilities.NET_CAPABILITY_VALIDATED);
        } catch (Exception ignored) {
            return false;
        }
    }

    private void showOfflineScreen() {
        if (webView == null || offlineScreenVisible) {
            updateOfflineRetryState();
            return;
        }
        offlineScreenVisible = true;
        webView.stopLoading();
        webView.loadDataWithBaseURL(
            "https://malawy-open-up.briramamonjisoa.workers.dev/",
            OFFLINE_HTML,
            "text/html",
            "UTF-8",
            null
        );
        updateOfflineRetryState();
    }

    private void updateOfflineRetryState() {
        if (webView == null || !offlineScreenVisible) return;
        boolean online = hasValidatedInternet();
        webView.evaluateJavascript("if(window.setOnline)window.setOnline(" + online + ");", null);
    }

    private void registerNetworkCallback() {
        if (networkCallbackRegistered) return;
        if (connectivityManager == null) {
            connectivityManager = (ConnectivityManager) getSystemService(CONNECTIVITY_SERVICE);
        }
        if (connectivityManager == null) return;
        if (networkCallback == null) {
            networkCallback = new ConnectivityManager.NetworkCallback() {
                @Override public void onAvailable(Network network) {
                    runOnUiThread(() -> updateOfflineRetryState());
                }
                @Override public void onCapabilitiesChanged(Network network, NetworkCapabilities caps) {
                    runOnUiThread(() -> updateOfflineRetryState());
                }
                @Override public void onLost(Network network) {
                    runOnUiThread(() -> {
                        if (!hasValidatedInternet()) showOfflineScreen();
                    });
                }
            };
        }
        try {
            NetworkRequest request = new NetworkRequest.Builder()
                .addCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
                .build();
            connectivityManager.registerNetworkCallback(request, networkCallback);
            networkCallbackRegistered = true;
        } catch (Exception ignored) { }
    }

    private void unregisterNetworkCallback() {
        if (!networkCallbackRegistered || connectivityManager == null || networkCallback == null) return;
        try { connectivityManager.unregisterNetworkCallback(networkCallback); }
        catch (Exception ignored) { }
        networkCallbackRegistered = false;
    }

    @Override public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().setStatusBarColor(android.graphics.Color.rgb(13,20,40));
        getWindow().setNavigationBarColor(android.graphics.Color.rgb(13,20,40));
        connectivityManager = (ConnectivityManager) getSystemService(CONNECTIVITY_SERVICE);

        webView = new WebView(this);
        webView.setBackgroundColor(android.graphics.Color.rgb(5,5,6));
        webView.getSettings().setJavaScriptEnabled(true);
        webView.getSettings().setDomStorageEnabled(true);
        webView.getSettings().setAllowFileAccess(true);
        webView.getSettings().setMediaPlaybackRequiresUserGesture(true);
        webView.addJavascriptInterface(new MalawyBridge(), "MalawyAndroid");
        webView.setWebViewClient(new WebViewClient() {
            @Override public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                if (!offlineScreenVisible && hasValidatedInternet()) {
                    view.evaluateJavascript("window.dispatchEvent(new Event('mou:refresh-fcm-token'));", null);
                }
            }
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                if (offlineScreenVisible) return true;
                return false;
            }

            @Override public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                super.onReceivedError(view, request, error);
                if (request.isForMainFrame()) showOfflineScreen();
            }
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

        if (!hasValidatedInternet()) {
            showOfflineScreen();
        } else if (savedInstanceState == null) {
            webView.loadUrl(HOME);
        } else {
            webView.restoreState(savedInstanceState);
        }

        requestNotificationPermission();
        handleNotificationIntent(getIntent());
        if (hasValidatedInternet()) checkForUpdate();
    }

    private void requestNotificationPermission() {
        if (Build.VERSION.SDK_INT >= 33 &&
            ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
            ActivityCompat.requestPermissions(this, new String[]{Manifest.permission.POST_NOTIFICATIONS}, NOTIFICATION_PERMISSION_REQUEST);
        }
    }

    private void handleNotificationIntent(Intent intent) {
        if (intent == null || webView == null || offlineScreenVisible || !hasValidatedInternet()) return;
        String path = intent.getStringExtra("mou_url");
        if (path != null && !path.isEmpty()) {
            String safePath = path.startsWith("/") ? path : "/";
            webView.post(() -> webView.evaluateJavascript("window.location.href=" + JSONObject.quote(HOME + safePath) + ";", null));
            intent.removeExtra("mou_url");
        }
    }

    @Override protected void onStart() {
        super.onStart();
        registerNetworkCallback();
        if (!hasValidatedInternet()) showOfflineScreen();
        else updateOfflineRetryState();
    }

    @Override protected void onResume() {
        super.onResume();
        if (!hasValidatedInternet()) showOfflineScreen();
        else { updateOfflineRetryState(); checkForUpdate(); }
    }

    @Override protected void onStop() {
        unregisterNetworkCallback();
        super.onStop();
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
        if (offlineScreenVisible) {
            super.onBackPressed();
        } else if (webView != null && webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }

    @Override protected void onDestroy() {
        unregisterNetworkCallback();
        if (webView != null) {
            webView.removeJavascriptInterface("MalawyAndroid");
            webView.destroy();
            webView = null;
        }
        super.onDestroy();
    }
}
