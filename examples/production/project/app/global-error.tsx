"use client";

// Kök layout'taki hataları yakalar. Kendi <html> ve <body> etiketlerini çizer;
// globals.css burada yüklü değildir, bu yüzden stiller satır içidir.
export default function GlobalError({ retry }: { error: unknown; retry: () => void }) {
  return (
    <html lang="tr">
      <body style={{ fontFamily: "system-ui, sans-serif", padding: "2.5rem 1rem" }}>
        <title>Hata | Sipariş paneli</title>
        <main role="alert" style={{ maxWidth: "48rem", margin: "0 auto" }}>
          <h1>Uygulama yüklenemedi</h1>
          <p>Beklenmeyen bir hata oluştu. Sayfayı yeniden yüklemeyi deneyin.</p>
          <button type="button" onClick={() => retry()}>
            Tekrar dene
          </button>
        </main>
      </body>
    </html>
  );
}
