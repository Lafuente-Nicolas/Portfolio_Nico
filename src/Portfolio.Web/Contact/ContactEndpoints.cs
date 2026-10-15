namespace Portfolio.Web.Contact;

public static class ContactEndpoints
{
    public const string RateLimitPolicy = "contact";

    public static IEndpointRouteBuilder MapContactEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapPost("/api/contact", HandleAsync)
           .RequireRateLimiting(RateLimitPolicy);

        return app;
    }

    private static async Task<IResult> HandleAsync(
        ContactRequest request,
        HttpContext httpContext,
        MessageStore store,
        EmailNotifier notifier,
        ILoggerFactory loggerFactory,
        CancellationToken cancellationToken)
    {
        var logger = loggerFactory.CreateLogger("Contact");

        // Champ piège rempli : on répond "ok" sans rien enregistrer, pour ne pas renseigner le robot.
        if (!string.IsNullOrWhiteSpace(request.Website))
        {
            logger.LogInformation("Message ignoré : champ piège rempli.");
            return Results.Ok(new { ok = true });
        }

        var errors = ContactValidator.Validate(request);
        if (errors.Count > 0)
            return Results.ValidationProblem(errors);

        var message = new ContactMessage(
            Id: Guid.NewGuid(),
            ReceivedAt: DateTimeOffset.UtcNow,
            Name: request.Name!.Trim(),
            Email: request.Email!.Trim(),
            Message: request.Message!.Trim(),
            IpAddress: httpContext.Connection.RemoteIpAddress?.ToString());

        await store.SaveAsync(message, cancellationToken);

        try
        {
            await notifier.NotifyAsync(message, cancellationToken);
        }
        catch (Exception ex)
        {
            // Le message est déjà enregistré : un souci d'email ne doit pas faire échouer l'envoi.
            logger.LogWarning(ex, "Impossible d'envoyer l'email pour le message {Id}.", message.Id);
        }

        return Results.Ok(new { ok = true });
    }
}
