using System.Threading.RateLimiting;
using Microsoft.AspNetCore.HttpOverrides;
using Portfolio.Web.Contact;

var builder = WebApplication.CreateBuilder(args);

// Services
builder.Services.Configure<SmtpOptions>(builder.Configuration.GetSection(SmtpOptions.SectionName));
builder.Services.AddSingleton<MessageStore>();
builder.Services.AddSingleton<EmailNotifier>();
builder.Services.AddProblemDetails();

// Derrière un hébergeur (proxy inverse), l'adresse IP réelle du visiteur arrive dans l'en-tête X-Forwarded-For.
// À activer uniquement en ligne ("ReverseProxy:Enabled": true), sinon un visiteur pourrait falsifier son IP.
var behindProxy = builder.Configuration.GetValue<bool>("ReverseProxy:Enabled");
if (behindProxy)
{
    builder.Services.Configure<ForwardedHeadersOptions>(options =>
    {
        options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
        options.ForwardLimit = 1;          // on ne fait confiance qu'au dernier relais : l'hébergeur
        options.KnownNetworks.Clear();     // l'adresse du proxy de l'hébergeur n'est pas connue à l'avance
        options.KnownProxies.Clear();
    });
}

// Limite : 5 messages par adresse IP toutes les 10 minutes sur le formulaire de contact
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    options.AddPolicy(ContactEndpoints.RateLimitPolicy, httpContext =>
        RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: httpContext.Connection.RemoteIpAddress?.ToString() ?? "inconnu",
            factory: _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 5,
                Window = TimeSpan.FromMinutes(10),
                QueueLimit = 0
            }));
});

var app = builder.Build();

if (behindProxy)
    app.UseForwardedHeaders();

if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler();
    app.UseHsts();
}

// Les messages de plus de 12 mois sont supprimés (durée annoncée dans la politique de confidentialité).
app.Services.GetRequiredService<MessageStore>().PurgeOlderThan(MessageStore.RetentionPeriod);

// En-têtes de sécurité
app.Use(async (context, next) =>
{
    var headers = context.Response.Headers;
    headers["X-Content-Type-Options"] = "nosniff";
    headers["Referrer-Policy"] = "strict-origin-when-cross-origin";
    headers["X-Frame-Options"] = "SAMEORIGIN"; // autorise les aperçus des projets dans le portfolio
    headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()";

    // Les sites de démonstration (entreprises fictives) ne doivent pas apparaître dans Google.
    if (context.Request.Path.StartsWithSegments("/projets"))
        headers["X-Robots-Tag"] = "noindex, nofollow";

    await next();
});

app.UseDefaultFiles();
app.UseStaticFiles();
app.UseRateLimiter();

app.MapGet("/api/health", () => Results.Ok(new { status = "ok", time = DateTimeOffset.UtcNow }));
app.MapContactEndpoints();

app.Run();
