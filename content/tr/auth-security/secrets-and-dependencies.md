---
title: "Secret ve bağımlılık güvenliği"
description: "Anahtarı istemciden uzak tutma, .env ve npm tedarik zinciri saldırıları."
lastVerified: "2026-10-22"
translationKey: "auth-security/secrets-and-dependencies"
---

Bir uygulama iki yoldan, kendi kodunuzda hiçbir hata yokken de ele geçirilebilir. Ya bir anahtar sızar ya da kurduğunuz bir paket kötü kod taşır. Bu ders ikisinin de en sık görülen hâllerini ve basit önlemlerini anlatıyor.

> [!NOTE]
>
> `.env` dosyaları, `NEXT_PUBLIC_` öneki ve açılışta doğrulama [Ortam değişkenleri](/academy/production/environment-variables) dersinde anlatıldı. Burada yalnızca güvenlik tarafı var.

## Secret Nereden Sızar

**1. İstemci paketi.** `NEXT_PUBLIC_` önekli her değişken derleme anında JavaScript paketine yazılır ve herkes okuyabilir.[^1] Secret okuyan modülün başına `import "server-only"` ekleyin; bir Client Component onu import ederse derleme hata verir.[^1]

**2. Props.** Server Component'ten Client Component'e verilen her değer tarayıcıya gider. Veritabanından gelen kullanıcı nesnesini olduğu gibi aktarırsanız parola özeti ya da e-posta gibi alanlar da gider. Next.js bu yüzden yalnızca gereken alanları taşıyan küçük nesneler *(DTO)* döndürmeyi önerir:[^1]

```ts
// lib/users.ts
import "server-only";

export async function getProfileDTO(id: string) {
  const user = await db.user.findUnique({ where: { id } });

  return { name: user.name, avatarUrl: user.avatarUrl };
}
```

**3. Git geçmişi.** Anahtarı içeren dosyayı silmek yetmez, eski commit'lerde durur. OWASP sızan bir anahtar için sırayı şöyle verir: önce **iptal et**, sonra **yenisini üret**, en son **kayıtlardan temizle**.[^2] Geçmişi yeniden yazmak diğer kopyaları düzeltmez; anahtarı iptal etmek tek kesin çözümdür.

> [!TIP]
>
> GitHub'ın **push protection** özelliği, bilinen anahtar biçimlerini push sırasında yakalayıp reddeder. Kişisel hesaplarda açık depolara push için varsayılan olarak açıktır. Depo düzeyinde ayrıca açılması gerekir.[^3]

## Tedarik Zinciri

Bir paket kurmak, onun ve onun bağımlılıklarının yazarlarına güvenmek demektir. [Liran Tal](https://lirantal.com/), ortalama bir npm paketiyle onlarca bakımcıya güvendiğinizi hatırlatır.[^4] Saldırgan bu bakımcılardan birinin hesabını ele geçirirse kötü kod sizin bilgisayarınıza ve CI'ınıza kadar gelir.

Eylül 2025'te **Shai-Hulud** adlı bir solucan 500'den fazla npm paketini ele geçirdi. CISA'nın uyarısına göre paket kurulduğunda bilgisayardaki GitHub token'larını ve bulut anahtarlarını topladı. Sonra geliştiricinin npm hesabıyla onun diğer paketlerine de kendini ekleyip yayınladı.[^5]

Saldırıların çoğu üç kapıdan girer:[^4][^6]

| Saldırı | Nasıl çalışır |
| :-- | :-- |
| Ele geçirilmiş paket | Popüler bir paketin yeni sürümüne kötü kod eklenir |
| Typosquatting | `cross-env` yerine `crossenv` gibi benzer isimli sahte paket |
| Slopsquatting | Yapay zekanın uydurduğu paket adıyla önceden yayınlanmış sahte paket |

## Kurulumu Sıkılaştırmak

### Lockfile ile kurun

Lockfile, hangi sürümün kurulacağını sabitler. CI'da `npm install` yerine `npm ci` kullanın: lockfile ile `package.json` uyuşmazsa kurulum durur, sessizce yeni sürüm gelmez.[^6]

### Kurulum script'lerini onaylayın

Shai-Hulud gibi saldırılar kodlarını `postinstall` script'inde çalıştırır. [!npm] npm 12 bağımlılıkların kurulum script'lerini artık varsayılan olarak çalıştırmıyor; [!pnpm] pnpm bunu v10'dan beri yapıyor.[^7][^8]

```command
npm install esbuild
```

```text
npm warn install-scripts 1 package had install scripts blocked because they are not covered by allowScripts:
npm warn install-scripts   esbuild@0.25.0 (postinstall: node install.js)
```

Paketi tanıyorsanız `npm install-scripts approve esbuild` ile onaylarsınız. Onay `package.json`'daki `allowScripts` alanına sürümüyle birlikte yazılır.[^7] Testte `esbuild` `0.25.1`'e yükseltilince onay yeniden istendi.

### Yeni sürümü hemen kurmayın

Ele geçirilmiş bir sürüm çoğu zaman topluluk tarafından fark edilip kaldırılır. Yeni sürümü birkaç gün beklemek, bu süreyi size kazandıran ucuz bir önlemdir.[^4]

```ini
# .npmrc
min-release-age=7
```

npm 11.10'dan beri bu ayar, son 7 gün içinde yayınlanan sürümleri kurulumdan çıkarır.[^7] Testte `next@16.4.2` 6 gün önce yayınlandığı için kurulmadı, yerine `16.4.1` geldi. pnpm'de aynı işi `minimumReleaseAge` yapar.[^8]

> [!WARNING]
>
> Bekleme süresi güvenlik yamalarını da geciktirir. npm, `npm audit fix` bekleme yüzünden bir yamayı kuramazsa uyarır; o paketi `min-release-age-exclude` listesine ekleyebilirsiniz.[^7]

### Güncellemeleri bir bota bırakın

Dependabot ya da Renovate güncellemeleri pull request olarak açar. Testler geçmeden hiçbir sürüm ana dala girmez. Dependabot'un `cooldown` ayarı da yeni sürümleri birkaç gün bekletir; güvenlik güncellemeleri bu beklemeye takılmaz.[^9]

```yaml
# .github/dependabot.yml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
    cooldown:
      default-days: 7
```

### Bilinen açıkları tarayın

`npm audit`, bağımlılıklarınızda bilinen bir açık olup olmadığını söyler. Ama yalnızca **bilinen** açıkları bulur; yeni yayınlanmış kötü bir sürümü yakalamaz.[^6]

> [!DO]
>
> - Yapay zekanın önerdiği bir paketi kurmadan önce `npm view <paket>` ile var olduğunu, indirme sayısını ve deposunu kontrol edin.[^6]
> - npm ve GitHub hesabınızda kimlik avına dayanıklı iki adımlı doğrulama *(passkey ya da güvenlik anahtarı)* kullanın.[^5]
> - Paket yayınlıyorsanız uzun ömürlü token yerine **trusted publishing** kullanın.[^6]

## Kendin Dene

- Bir projede `npm install --min-release-age=7` çalıştırın ve `npm ls` ile hangi sürümlerin geldiğine bakın.
- `.env.local`'e sahte bir anahtar yazıp yanlışlıkla commit'leyin. Sonra dosyayı silip `git log -p` ile anahtarın geçmişte hâlâ durduğunu görün.
- `package.json`'daki `allowScripts` alanını okuyun. Hangi paketin neden kurulum script'i çalıştırdığını araştırın.

## Detaylı Öğrenmek İçin

- **Resmi doküman:** OWASP NPM Security Cheat Sheet; lockfile, kurulum script'leri, typosquatting ve trusted publishing.[^6]
- **Konuşma:** Liran Tal, "Security Controls in the JavaScript Supply Chain" *(JSNation 2022, 28 dk)*; lockfile'a gizlenen kod, kurulum script'leri ve gecikmeli güncelleme.[^4]
- **Resmi doküman:** CISA, Shai-Hulud uyarısı; gerçek bir saldırının nasıl yayıldığı ve önerilen adımlar.[^5]

## Kaynaklar

1. [Next.js: How to think about data security](https://nextjs.org/docs/app/guides/data-security) *(doc)* — DTO döndürmek, `server-only`, `NEXT_PUBLIC_` değişkenlerinin istemciye gitmesi ve taint API'leri.
2. [OWASP: Secrets Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html) *(doc)* — Sızıntıda iptal, döndürme ve silme sırası; git geçmişini yeniden yazmanın sonuçları.
3. [GitHub Docs: About push protection](https://docs.github.com/en/code-security/concepts/secret-security/about-push-protection) *(doc)* — Push sırasında anahtar engelleme, kullanıcı ve depo düzeyindeki varsayılanlar.
4. [Liran Tal](https://lirantal.com/): [Security Controls in the JavaScript Supply Chain](https://gitnation.com/contents/security-controls-in-the-javascript-supply-chain) *(video)* — JSNation 2022. Bağımlılıklara duyulan güven, lockfile'a gizlenen kod, kurulum script'leri ve güncellemeleri geciktirmek.
5. [CISA: Widespread Supply Chain Compromise Impacting npm Ecosystem](https://www.cisa.gov/news-events/alerts/2025/09/23/widespread-supply-chain-compromise-impacting-npm-ecosystem) *(doc)* — 23 Eylül 2025. Shai-Hulud'un 500'den fazla paketi ele geçirmesi, topladığı anahtarlar, yayılma yolu ve öneriler.
6. [OWASP: NPM Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/NPM_Security_Cheat_Sheet.html) *(doc)* — `npm ci`, kurulum script'leri, açık taraması, typosquatting, slopsquatting ve trusted publishing.
7. [npm CLI: Changelog](https://github.com/npm/cli/blob/latest/CHANGELOG.md) *(repo)* — 11.10.0'da `min-release-age`, 12.0.0'da varsayılan olarak engellenen kurulum script'leri ve `npm install-scripts approve`.
8. [pnpm: Settings](https://pnpm.io/settings) *(doc)* — `minimumReleaseAge` ve kurulum script'lerine izin verme ayarları.
9. [GitHub Docs: Dependabot options reference](https://docs.github.com/en/code-security/dependabot/working-with-dependabot/dependabot-options-reference) *(doc)* — `cooldown` ayarı ve güvenlik güncellemelerinin bu beklemeye takılmaması.
