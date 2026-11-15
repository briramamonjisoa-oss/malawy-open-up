package mg.malawy.openup;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Intent;
import android.os.Build;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;
import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;
import java.util.Map;

public class MalawyFirebaseMessagingService extends FirebaseMessagingService {
    private static final String CHANNEL_ID = "malawy_tournament_updates";

    @Override
    public void onNewToken(String token) {
        super.onNewToken(token);
        getSharedPreferences("malawy_push", MODE_PRIVATE).edit().putString("fcm_token", token).apply();
    }

    @Override
    public void onMessageReceived(RemoteMessage message) {
        super.onMessageReceived(message);
        Map<String, String> data = message.getData();
        String title = data.get("title");
        String body = data.get("body");
        if (message.getNotification() != null) {
            if (title == null) title = message.getNotification().getTitle();
            if (body == null) body = message.getNotification().getBody();
        }
        if (title == null || title.trim().isEmpty()) title = "MALAWY OPEN UP";
        if (body == null) body = "Tu as une nouvelle notification.";
        String url = data.get("url");
        showNotification(title, body, url == null ? "/#home" : url);
    }

    private void showNotification(String title, String body, String url) {
        NotificationManager manager = getSystemService(NotificationManager.class);
        if (manager == null) return;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(CHANNEL_ID, "MALAWY OPEN UP", NotificationManager.IMPORTANCE_HIGH);
            channel.setDescription("Notifications des tournois et du compte joueur");
            manager.createNotificationChannel(channel);
        }
        Intent intent = new Intent(this, MainActivity.class);
        intent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        intent.putExtra("mou_url", url);
        PendingIntent pendingIntent = PendingIntent.getActivity(
            this, (int) System.currentTimeMillis(), intent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        NotificationCompat.Builder notification = new NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_malawy)
            .setContentTitle(title)
            .setContentText(body)
            .setStyle(new NotificationCompat.BigTextStyle().bigText(body))
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setAutoCancel(true)
            .setContentIntent(pendingIntent);
        try {
            NotificationManagerCompat.from(this).notify((int) System.currentTimeMillis(), notification.build());
        } catch (SecurityException ignored) { }
    }
}
