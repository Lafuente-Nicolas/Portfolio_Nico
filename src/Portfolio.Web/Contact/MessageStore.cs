using System.Text.Encodings.Web;
using System.Text.Json;

namespace Portfolio.Web.Contact;

/// <summary>
/// Enregistre chaque message reçu sur une ligne JSON dans App_Data/messages.jsonl.
/// Simple, sans base de données, et facile à relire.
/// </summary>
public sealed class MessageStore
{
    /// <summary>Durée de conservation annoncée dans la politique de confidentialité.</summary>
    public static readonly TimeSpan RetentionPeriod = TimeSpan.FromDays(365);

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        Encoder = JavaScriptEncoder.UnsafeRelaxedJsonEscaping // garde les accents lisibles dans le fichier
    };

    private readonly SemaphoreSlim _lock = new(1, 1);
    private readonly string _filePath;
    private readonly ILogger<MessageStore> _logger;

    public MessageStore(IWebHostEnvironment environment, ILogger<MessageStore> logger)
    {
        _logger = logger;
        var directory = Path.Combine(environment.ContentRootPath, "App_Data");
        Directory.CreateDirectory(directory);
        _filePath = Path.Combine(directory, "messages.jsonl");
    }

    public async Task SaveAsync(ContactMessage message, CancellationToken cancellationToken)
    {
        var line = JsonSerializer.Serialize(message, JsonOptions) + Environment.NewLine;

        await _lock.WaitAsync(cancellationToken);
        try
        {
            await File.AppendAllTextAsync(_filePath, line, cancellationToken);
        }
        finally
        {
            _lock.Release();
        }
    }

    /// <summary>Supprime les messages reçus il y a plus de <paramref name="maxAge"/>.</summary>
    public void PurgeOlderThan(TimeSpan maxAge)
    {
        if (!File.Exists(_filePath))
            return;

        _lock.Wait();
        try
        {
            var limit = DateTimeOffset.UtcNow - maxAge;
            var lines = File.ReadAllLines(_filePath);
            var kept = lines.Where(line => IsRecent(line, limit)).ToArray();

            if (kept.Length == lines.Length)
                return;

            File.WriteAllLines(_filePath, kept);
            _logger.LogInformation("{Count} message(s) de plus de {Days} jours supprimé(s).",
                lines.Length - kept.Length, (int)maxAge.TotalDays);
        }
        finally
        {
            _lock.Release();
        }
    }

    private static bool IsRecent(string line, DateTimeOffset limit)
    {
        if (string.IsNullOrWhiteSpace(line))
            return false;

        try
        {
            var message = JsonSerializer.Deserialize<ContactMessage>(line, JsonOptions);
            return message is null || message.ReceivedAt >= limit;
        }
        catch (JsonException)
        {
            return true; // ligne illisible : on la garde plutôt que de perdre un message
        }
    }
}
