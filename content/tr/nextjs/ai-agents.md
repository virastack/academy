---
title: "AI agent'larla Next.js"
description: "Paketle gelen doküman, AGENTS.md, MCP, hata prompt'ları ve Next.js skill'leri."
lastVerified: "2026-10-21"
translationKey: "nextjs/ai-agents"
---

## Sorun: Model Eski Next.js'i Biliyor

Next.js son iki yılda hızlı değişti. Bir modelin eğitim verisi çoğu zaman kurulu sürümden eskidir ve eski kalıpları önerir.[^1] Bu rehberde gördüğünüz değişikliklerin AI çıktısında sık görülen eski hâlleri:

| Eski öneri | Next.js 16.4'te |
| :-- | :-- |
| `middleware.ts` | `proxy.ts` |
| `export const revalidate = 60`, `dynamic = "force-static"` | `"use cache"` ve `cacheLife` |
| `params.slug` | `const { slug } = await params` |
| `import { useRouter } from "next/router"` | `next/navigation` |
| `error.tsx`'te `reset()` | `retry()` |
| `next lint` | `eslint` |
| `getServerSideProps` | Server Component'te `await` |

Next.js ekibi bu sorunu framework'ün içinden çözmeye karar verdi. 16.2'den beri her sürüm agent'lar için ayrı araçlarla geliyor.[^2][^3]

## Paketle Gelen Doküman ve AGENTS.md

Next.js 16.2'den beri doküman paketin içinde, `node_modules/next/dist/docs/` altında gelir. Kurulu sürümle birebir eşleşir ve internet gerektirmez. 16.3'ten beri `create-next-app` ve `next dev`, projenin kökündeki `AGENTS.md`'ye agent'ı bu klasöre yönlendiren bir blok yazar:[^1]

```md
<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ
from your training data. Read the relevant guide in `node_modules/next/dist/docs/`
before writing any code. Heed deprecation notices.

<!-- END:nextjs-agent-rules -->
```

Next.js yalnızca işaretler arasındaki kısmı yönetir; dosyanın geri kalanına kendi kurallarınızı yazabilirsiniz. Kapatmak için `next.config.ts`'te `agentRules: false`.[^4]

Neden skill değil de `AGENTS.md`? Vercel'in Next.js 16 değerlendirmesinde `AGENTS.md`'ye gömülü sıkıştırılmış bir doküman dizini testlerin %100'ünü geçti; skill tabanlı yaklaşım en iyi ihtimalle %79'da kaldı. Vakaların %56'sında agent skill'i hiç çağırmamıştı.[^5] Sonuç: her zaman bağlamda duran bilgi, agent'ın gerektiğinde araması gereken bilgiyi yener.

> [!TIP]
>
> [!claudeCode] dizinde `CLAUDE.md` varsa `AGENTS.md`'yi okumaz. İkisini birden kullanıyorsanız `CLAUDE.md`'nin içine `@AGENTS.md` yazarak onu içe aktarın. Kural dosyaları [Prompt ve Context Engineering](/academy/ai/prompt-and-context-engineering) dersinde.

Agent `node_modules`'a erişemiyorsa: nextjs.org'daki her doküman sayfası `.md` uzantısıyla düz Markdown döner, `/docs/llms.txt` de bir dizin sunar.[^1]

## Hatalar Prompt'a Dönüşür

Cache Components açıkken engelleyici bir hata, etiketli çözümlerle gelir. Aynı liste geliştirme ekranında, terminalde ve `next build` çıktısında görünür; yani CI loglarını okuyan bir agent da görür:[^1]

```text
Route "/products/[slug]": Next.js encountered uncached data during prerendering.

Ways to fix this:
  - [stream] Provide a placeholder with `<Suspense fallback={...}>` around the data access
  - [cache] Cache the data access with `"use cache"`
  - [block] Set `export const instant = false` to allow a blocking route

Learn more: https://nextjs.org/docs/messages/blocking-prerender-dynamic
```

Hata ekranındaki **Copy prompt** butonu seçtiğiniz çözümü agent'a yapıştırılacak bir talimata çevirir. `Learn more` sayfaları da agent'lar okusun diye yazılmıştır: her çözümün kalıbı, ödünleşimi ve ilk denemede gözden kaçan noktalar.[^1]

## Çalışan Uygulamayı Görmek

Agent'ın değişikliğini doğrulaması için hem framework'ün hem tarayıcının gördüğünü bilmesi gerekir:[^1][^6]

- `next dev`, tarayıcı konsolundaki hata ve uyarıları terminale de yazar; agent zaten okuduğu çıktıda istemci hatalarını görür.
- Dev sunucusu `/_next/mcp` adresinde bir MCP uç noktası açar. `next-devtools-mcp` ile bağlanan agent rotaları, hataları ve derleme sorunlarını okur; `next build` çalıştırmadan kodun derlenip derlenmediğini sorabilir. Kurulumu [MCP](/academy/ai/mcp) dersinde.
- `next-dev-loop` skill'i, `agent-browser` CLI'ı ile tarayıcının DOM, konsol ve ağ görünümünü ekler. React DevTools açık başlatıldığı için component ağacını ve bekleyen Suspense sınırlarını da okur.

## Next.js Skill'leri

Doküman bilgiyi verir, skill'ler ise **çok adımlı işleri** sıralar. Next.js ekibinin kendi skill'leri:[^1][^7]

| Skill | Ne yapar |
| :-- | :-- |
| `next-dev-loop` | Her düzenlemeden sonra çalışan dev sunucusunda ve tarayıcıda doğrular |
| `next-cache-components-adoption` | Mevcut bir uygulamayı Cache Components'e taşır, her adımda size danışır |
| `next-cache-components-optimizer` | Bir sayfanın statik kabuğunu büyütür; önce başarısız bir `instant()` testi yazar |
| `next-partial-prefetching-adoption` | Uygulamayı Partial Prefetching'e taşır |
| `next-bundle-optimizer` | Turbopack'in bundle analizine bakıp istemci paketini küçültür *(16.4)* |

```command
npx skills add vercel/next.js --skill next-dev-loop
```

> *"Her düzenlemeden sonra next-dev-loop skill'iyle sayfanın çalıştığını doğrula."*

`optimizer` skill'lerinin yöntemi iyi bir alışkanlık: önce istenen davranışı bir testle tarif et, test geçene kadar değiştir, testi commit'le ki gelecekteki bir değişiklik bozarsa yakalansın.[^1] Skill yazmanın genel kuralları [Skills](/academy/ai/skills) dersinde.

## Agent ile Sürüm Güncellemek

`next upgrade --agent`, yeni sürümün geçiş rehberlerini toplar ve işi agent'a devreder; agent değişikliği yapar ve uygulamayı doğrular. 16.4'te deneysel ve `canary` sürümüyle çalışıyor:[^8]

```bash
npx next@canary upgrade --agent=latest
```

> [!DO]
>
> - Agent'tan önce `AGENTS.md`'yi ve `node_modules/next/dist/docs/`'u okumasını isteyin.
> - "Bitti" demeden önce `npm run lint`, `tsc --noEmit` ve `next build` çalıştırmasını şart koşun.
> - Önerilen kodu yukarıdaki tabloyla karşılaştırın; eski bir kalıp görürseniz agent'a ilgili doküman sayfasını verin.

## Kendin Dene

- Bir AI aracına `AGENTS.md`'siz bir klasörde *"Next.js'te ürün sayfasını 60 saniyede bir yenilenecek şekilde cache'le"* deyin. Sonra aynı isteği `create-next-app` ile açılmış projede yapın. Cevapları tablodaki satırlarla karşılaştırın.
- Bir sayfada cache'lenmemiş veriyi `<Suspense>` dışında okuyun. Hata ekranındaki **Copy prompt**'u bir agent'a yapıştırın ve hangi çözümü seçtiğine bakın.
- `next-devtools-mcp`'yi bağlayın ve agent'a *"projedeki rotaları listele"* deyin.

## Detaylı Öğrenmek İçin

- **Resmi doküman:** "How Next.js supports AI coding agents"; paketle gelen doküman, hata rehberleri, MCP, skill'ler ve agent geri bildirimi.[^1]
- **Yazı:** Vercel'in "AGENTS.md outperforms skills in our agent evals" yazısı; değerlendirmenin nasıl kurulduğu ve skill'lerin neden geride kaldığı.[^5]
- **Resmi doküman:** Next.js 16.2 ve 16.3'ün AI duyuruları; bu araçların hangi sürümde neden geldiği.[^2][^3]

## Kaynaklar

1. [Next.js: AI Coding Agents](https://nextjs.org/docs/app/guides/ai-agents) *(doc)* — Paketle gelen doküman, `AGENTS.md` bloğu, `.md` ve `llms.txt`, etiketli hata çözümleri, çalışma zamanı görünürlüğü ve Next.js skill'leri.
2. [Next.js Blog: Next.js 16.2, AI Improvements](https://nextjs.org/blog/next-16-2-ai) *(doc)* — 18 Mart 2026. Paketle gelen doküman ve agent'ların tarayıcıyı kullanması için ilk araçlar.
3. [Next.js Blog: Next.js 16.3, AI Improvements](https://nextjs.org/blog/next-16-3-ai-improvements) *(doc)* — 26 Haziran 2026. `AGENTS.md` ile doküman, ilk Next.js skill'leri, Agent Browser ve odaklanmış MCP sunucusu.
4. [Next.js: agentRules](https://nextjs.org/docs/app/api-reference/config/next-config-js/agentRules) *(doc)* — Yönetilen talimat bloğu, kapatma ve sürüm geçmişi.
5. [Vercel: AGENTS.md outperforms skills in our agent evals](https://vercel.com/blog/agents-md-outperforms-skills-in-our-agent-evals) *(article)* — Ocak 2026. `AGENTS.md`'de doküman dizini %100, skill'ler en fazla %79; skill'in vakaların %56'sında çağrılmaması.
6. [Next.js: Next.js MCP Server](https://nextjs.org/docs/app/guides/mcp) *(doc)* — `/_next/mcp`, `next-devtools-mcp` ve çalışma zamanı araçları.
7. [Next.js: skills](https://github.com/vercel/next.js/tree/canary/skills) *(repo)* — Next.js ekibinin skill'lerinin kaynağı.
8. [Next.js: Upgrade with a coding agent](https://nextjs.org/docs/app/guides/upgrading/agent-upgrade) *(doc)* — `next upgrade --agent` ve güncelleme politikaları.
