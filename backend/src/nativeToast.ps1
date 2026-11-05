param(
    [string]$Title = "INTRUDER DETECTED",
    [string]$Message = "Intruder detected within threshold! Check Dashboard."
)

[Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime] | Out-Null
$template = [Windows.UI.Notifications.ToastNotificationManager]::GetTemplateContent([Windows.UI.Notifications.ToastTemplateType]::ToastText02)
$textNodes = $template.GetElementsByTagName("text")
$null = $textNodes.Item(0).AppendChild($template.CreateTextNode($Title))
$null = $textNodes.Item(1).AppendChild($template.CreateTextNode($Message))

$toast = [Windows.UI.Notifications.ToastNotification]::new($template)
$appId = "{1AC14E77-02E7-4E5D-B744-2EB1AE5198B7}\WindowsPowerShell\v1.0\powershell.exe"
[Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier($appId).Show($toast)
Write-Output "Native toast sent successfully"
