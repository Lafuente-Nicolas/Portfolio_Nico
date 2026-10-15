using System.Net.Sockets;
using MailKit.Net.Smtp;
using MailKit.Security;
using Microsoft.Extensions.Options;
using MimeKit;

namespace Portfolio.Web.Contact;

public sealed class SmtpOptions
{
    public const string SectionName = "Smtp";

    public string? Host { get; set; }
    public int Port { get; set; } = 587;
    public bool EnableSsl { get; set; } = true;
    public string? User { get; set; }
    public string? Password { get; set; }
    public string? From { get; set; }
    public string? To { get; set; }

    public bool IsConfigured =>
        !string.IsNullOrWhiteSpace(Host)
        && !string.IsNullOrWhiteSpace(From)
        && !string.IsNullOrWhiteSpace(To);
}

/// <summary>Envoie un email à chaque nouveau message, si le SMTP est configuré (via MailKit).</summary>
public sealed class EmailNotifier(IOptions<SmtpOptions> options, ILogger<EmailNotifier> logger)
{
    private readonly SmtpOptions _options = options.Value;

    public async Task NotifyAsync(ContactMessage message, CancellationToken cancellationToken)
    {
        if (!_options.IsConfigured)
        {
            logger.LogInformation("SMTP non configuré : message {Id} enregistré sans envoi d'email.", message.Id);
            return;
        }

        var mail = new MimeMessage();
        mail.From.Add(MailboxAddress.Parse(_options.From!.Trim()));
        mail.To.Add(MailboxAddress.Parse(_options.To!.Trim()));
        mail.ReplyTo.Add(new MailboxAddress(message.Name, message.Email));
        mail.Subject = $"Portfolio : nouveau message de {message.Name}";
        mail.Body = new TextPart("plain")
        {
            Text =
                $"Nom : {message.Name}\n" +
                $"Email : {message.Email}\n" +
                $"Reçu le : {message.ReceivedAt:dd/MM/yyyy HH:mm} (UTC)\n\n" +
                message.Message
        };

        // 465 = connexion chiffrée directe ; 587 = connexion puis passage en chiffré (STARTTLS)
        var security = _options.Port == 465
            ? SecureSocketOptions.SslOnConnect
            : _options.EnableSsl ? SecureSocketOptions.StartTls : SecureSocketOptions.None;

        var host = _options.Host!.Trim();

        try
        {
            using var client = new SmtpClient { Timeout = 15000 };
            await client.ConnectAsync(host, _options.Port, security, cancellationToken);

            if (!string.IsNullOrWhiteSpace(_options.User))
            {
                // Les mots de passe d'application Google s'affichent avec des espaces : on les retire.
                var password = (_options.Password ?? string.Empty).Replace(" ", string.Empty);
                await client.AuthenticateAsync(_options.User.Trim(), password, cancellationToken);
            }

            await client.SendAsync(mail, cancellationToken);
            await client.DisconnectAsync(true, cancellationToken);
            logger.LogInformation("Email envoyé pour le message {Id}.", message.Id);
        }
        catch (AuthenticationException)
        {
            logger.LogWarning(
                "Email non envoyé ({Id}) : identifiant ou mot de passe refusé par {Host}. " +
                "Pour Gmail, il faut un mot de passe d'application, pas le mot de passe du compte.", message.Id, host);
        }
        catch (Exception ex) when (ex is SmtpCommandException or SmtpProtocolException
                                   && ex.Message.Contains("5.7.8"))
        {
            // Gmail coupe la connexion avec le code 5.7.8 quand l'identifiant ou le mot de passe est refusé.
            logger.LogWarning(
                "Email non envoyé ({Id}) : identifiant ou mot de passe refusé par {Host}. " +
                "Pour Gmail, il faut un mot de passe d'application, pas le mot de passe du compte.", message.Id, host);
        }
        catch (SslHandshakeException ex)
        {
            logger.LogWarning(ex,
                "Email non envoyé ({Id}) : échec de la connexion sécurisée avec {Host}:{Port}. " +
                "Un antivirus qui analyse les emails peut en être la cause.", message.Id, host, _options.Port);
        }
        catch (SocketException ex)
        {
            logger.LogWarning(ex,
                "Email non envoyé ({Id}) : impossible de joindre {Host}:{Port}. " +
                "Vérifiez la connexion internet, le pare-feu ou l'antivirus.", message.Id, host, _options.Port);
        }
    }
}
