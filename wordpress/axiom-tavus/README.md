# Axiom Tavus Avatar (WordPress plugin)

Puts the Axiom × Alan Tavus video avatar on supergrok.ca, or any WordPress site.
Visitors click a button and talk to the avatar right on the page.
Your Tavus API key stays on the server. Visitors never see it.

## What you need first

1. A Tavus account with the persona built from the doc **Tavus Persona — Axiom × Alan**.
2. Your **Persona ID** (Tavus dashboard → Personas).
3. Your **Replica ID**, unless the persona already has one saved.
4. Your **Tavus API key** (Tavus dashboard → API Keys).

## Install on GoDaddy WordPress

1. Zip the `axiom-tavus` folder so the zip holds `axiom-tavus/axiom-tavus.php`.
2. In WordPress admin go to **Plugins → Add New → Upload Plugin**, pick the zip, then click **Activate**.
3. Go to **Settings → Axiom Tavus**. Fill in the Persona ID, the Replica ID and the API key. Click **Save**.
4. Edit the page where the avatar should live. Add a **Shortcode** block with `[axiom_tavus]`.
5. Preview the page, click **Talk to Axiom**, and allow the camera and microphone.

## Safer place for the API key (optional)

The settings field works. To keep the key out of the database, add this line to
`wp-config.php` above the line that says "That's all, stop editing". Use
GoDaddy's File Manager or SFTP:

```php
define( 'TAVUS_API_KEY', 'paste-your-key-here' );
```

When that line exists, the plugin uses it and hides the key field.

## Cost guards

Tavus bills by the minute, and the button is public. These settings cap the bill:

| Setting | Default | What it does |
|---|---|---|
| Longest call | 5 min | Tavus ends the call after this |
| Calls per day, whole site | 20 | No new calls after this, until tomorrow (UTC) |
| Wait between calls, per visitor | 10 min | One visitor can't start call after call |

After **End call**, Tavus closes the room about 30 seconds later.

## If it doesn't work

- **"The avatar is not set up yet."** The API key or Persona ID is missing.
- **"Could not start."** Check **Settings → Axiom Tavus** for typos. The PHP error log shows the Tavus reply. Look for lines starting with `[AxiomTavus]`.
- **The button does nothing.** Clear any caching plugin and the GoDaddy cache, then reload.
- **No camera prompt.** The site must load on `https://`.
