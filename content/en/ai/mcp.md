---
title: "MCP"
description: "MCP nedir? Figma, Playwright ve Next.js DevTools gibi sunucuları agent'a bağlama."
lastVerified: "2026-10-14"
translationKey: "ai/mcp"
---

MCP (Model Context Protocol), yapay zeka uygulamalarını dış sistemlere bağlamak için açık bir standarttır.[^1] Bir sunucu bağladığınızda ajan o sistemin araçlarını kendisi çağırır: Figma'dan tasarımı okur, tarayıcıyı sürer, çalışan dev sunucusundan hataları alır. Sizin sohbete yapıştırdığınız bilgiyle yetinmez.

Ne zaman bağlamalı? [!claudeCode] dokümanının ölçütü basit: bir araçtan sohbete sürekli veri kopyalıyorsanız (issue takipçisi, izleme paneli) o aracı bağlayın.[^2]

|  | [Skill](/academy/ai/skills) | MCP |
| --- | --- | --- |
| Ne verir? | Bir işi nasıl yapacağına dair talimat | Ajanın erişemediği bir sisteme araç erişimi |
| Frontend örneği | *"Yeni bileşen ekleme adımları"* | *"Figma çerçevesini oku"*, *"dev sunucusundaki hataları al"* |
| Bağlam maliyeti | Açıklama bağlamda, gövde gerektiğinde yüklenir | Araç tanımları; [!claudeCode] bunları gerekene kadar erteler.[^2] |

## Sunucu nasıl bağlanır?

[!claudeCode]'da uzak sunucu URL ile, yerel sunucu bir komutla eklenir (`--` işaretinden sonrası sunucunun komutudur):[^2]

```bash
claude mcp add --transport http figma https://mcp.figma.com/mcp
claude mcp add --transport stdio playwright -- npx @playwright/mcp@latest
```

[!cursor]'da aynı iş `.cursor/mcp.json` (proje) veya `~/.cursor/mcp.json` (tüm projeler) dosyasıyla yapılır:[^3]

```json
{
  "mcpServers": {
    "playwright": { "command": "npx", "args": ["@playwright/mcp@latest"] },
    "figma": { "url": "https://mcp.figma.com/mcp" }
  }
}
```

- **Ekiple paylaşın:** [!claudeCode]'da `--scope project` ile eklenen sunucu proje köküne `.mcp.json` yazar, commit edin. [!claudeCode] projeden gelen sunucuları kullanmadan önce sizden onay ister.[^2]
- **Yönetin:** [!claudeCode]'da `/mcp` sunucuların durumunu gösterir, OAuth girişi de buradan yapılır.[^2] [!cursor]'da sunucuyu Customize sayfasından açıp kapatırsınız, hata ayıklamak için *"MCP Logs"*a bakın.[^3]

## Üç frontend sunucusu

### Figma

Figma'nın önerdiği yol uzak sunucu.[^4] En kolay kurulum, MCP ayarını ve hazır skill'leri birlikte getiren eklenti: [!claudeCode]'da `claude plugin install figma@claude-plugins-official`, [!cursor]'da `/add-plugin figma`. İlk kullanımda OAuth ile giriş yaparsınız.[^4] Figma MCP'ye yalnızca Figma'nın MCP kataloğundaki istemciler bağlanabilir ([!claudeCode], [!cursor] ve [!vscode] listede).[^4]

- Uzak sunucuda tasarım **bağlantıyla** verilir: Figma'da çerçevenin veya katmanın bağlantısını kopyalayıp ajana yapıştırın. Seçime göre çalışma yalnızca masaüstü sunucuda var.[^4], [^5]
- Çıktı varsayılan olarak React ve Tailwind gelir. Promptla değiştirebilirsiniz: *"Bu çerçeveyi `src/components/ui` içindeki bileşenlerle uygula, Tailwind kullan."*[^5]
- `get_variable_defs` tasarımdaki renk, boşluk ve tipografi değişkenlerini verir. Çok büyük çerçevelerde `get_metadata` önce sade bir özet çıkarır, ajan sonra parça parça `get_design_context` çağırır.[^5]
- Code Connect kurarsanız ajan sıfırdan bileşen yazmak yerine kod tabanınızdaki gerçek bileşenleri kullanır.[^5]

### Playwright

Microsoft'un [!playwright] sunucusu tarayıcıyı ajana verir. Ekran görüntüsüyle değil, sayfanın erişilebilirlik ağacıyla (snapshot) çalışır, bu yüzden görsel modele gerek kalmaz.[^6] Ajan eylemleri snapshot'taki referanslarla yapar, ekran görüntüsüne bakarak işlem yapamaz.[^6]

- Frontend senaryosu: *"Dev sunucusunu 375 px genişlikte aç, sepet formunu doldur, konsolda hata var mı bak."* Bunun için `browser_resize`, `browser_fill_form` ve `browser_console_messages` araçları var.[^6] Karanlık mod gibi durumlar için `browser_emulate_media` da var.[^6]
- Varsayılan olarak tarayıcı profili kalıcıdır, oturum açtığınız siteler hatırlanır. `--isolated` profili yalnızca bellekte tutar.[^6]

### Next.js DevTools

Next.js 16 ve sonrasında dev sunucusu `/_next/mcp` adresinde kendi MCP uç noktasını açar (varsayılan açık). `next-devtools-mcp` paketi bu uç noktaya bağlanır.[^7] Yapılandırma:[^7]

```json
{
  "mcpServers": {
    "next-devtools": {
      "command": "npx",
      "args": ["-y", "next-devtools-mcp@latest"]
    }
  }
}
```

- `get_errors` build, çalışma zamanı ve hydration hatalarını kaynak haritalı stack'le verir. Örnek: *"Sayfadaki hataları düzelt"* dediğinizde ajan hatayı kendisi okur.[^7]
- `get_routes` rotaları, `get_compilation_issues` ve `compile_route` derleme sorunlarını verir. Ajan düzenleme sırasında `next build` çalıştırmak yerine dev sunucusundan kontrol edebilir.[^7]
- `get_page_metadata` gibi bazı araçlar, sayfanın tarayıcıda açık olmasını gerektirir.[^7]
- Next.js'in `next-dev-loop` gibi skill'leri `/_next/mcp`'yi doğrudan çağırır, yani bunlar için ayrıca MCP kurmanız gerekmez.[^7]

> [!TIP]
>
> **MCP mi, skill/CLI mi?** [!playwright]'ın kendi README'si bile coding agent'lar için CLI ve skill kombinasyonunu öneriyor: araç şemalarını ve uzun snapshot'ları bağlama yüklemediği için daha ucuz. MCP ise kalıcı durum ve zengin inceleme gereken keşif döngülerinde anlamlı.[^6] Pratik kural: ajan zaten bildiği bir CLI'yı (`gh`, `playwright`) kullanabiliyorsa onu deneyin, kimlik ve yapılandırılmış veri gereken sistemler (Figma, çalışan dev sunucusu) için MCP bağlayın.

> [!WARNING]
>
> **Her sunucu bir güven kararıdır.** Simon Willison'ın *"ölümcül üçlü"*sü: ajan aynı anda (1) özel verinize erişebiliyor, (2) güvenilmeyen içerik görebiliyor ve (3) dışarıyla iletişim kurabiliyorsa, bir saldırgan onu veri sızdırmaya ikna edebilir. MCP farklı kaynaklardan araçları karıştırmayı kolaylaştırdığı için bu üçlüyü kazara kurmak çok kolay.[^8] Korumalık ürünleri bunu %100 engelleyemez, tek güvenli yol üçlüyü kurmamak.[^8]

- Oturum açılmış kalıcı profille [!playwright]'a rastgele siteler gezdirmek bu üçlüye yaklaşır. Gezintiyi `localhost`'la sınırlayın, gerekirse `--isolated` kullanın. README, `--allowed-origins`'in güvenlik sınırı olmadığını söylüyor.[^6]
- Yalnızca güvendiğiniz kaynaklardan kurun. Sunucuya mümkün olan en dar yetkiyi verin. [!claudeCode] dokümanı örnek olarak veritabanı sunucusuna salt okunur kullanıcı vermeyi öneriyor.[^2], [^3]
- Araç onaylarını ezbere vermeyin. [!cursor] varsayılan olarak her MCP aracı için onay ister.[^3]
- Kullanmadığınız sunucuyu kapatın: her sunucu bağlama araç ekler.[^2], [^3]

## Kendin dene

1. Next.js projenizde `next-devtools-mcp`'yi bağlayın, dev sunucusunu çalıştırıp sayfaya kasıtlı bir hydration hatası ekleyin. Ajana *"sayfadaki hataları düzelt"* deyin.
2. Figma eklentisini kurun, bir bileşen çerçevesinin bağlantısını verip *"`src/components/ui` bileşenleriyle uygula"* deyin. Sonra aynı işi bağlantısız, açıklamayla isteyip farkı karşılaştırın.
3. [!playwright] sunucusuyla uygulamanızı dar ekranda açtırıp formu doldurtun. Sonra `/mcp` ([!claudeCode]) veya Customize ([!cursor]) üzerinden hangi sunucuları gerçekten kullandığınıza bakıp kullanmadığınızı kapatın.

## Ek kaynaklar

1. [Model Context Protocol: What is MCP?](https://modelcontextprotocol.io/docs/getting-started/intro) *(article)* — MCP'nin tanımı ve ekosistemi.
2. [Claude Code: Connect Claude Code to tools via MCP](https://code.claude.com/docs/en/mcp) *(article)* — Sunucu ekleme komutları, kapsamlar, `.mcp.json`, onay ve araç ertelemesi.
3. [Cursor: Model Context Protocol (MCP)](https://cursor.com/docs/mcp) *(article)* — `mcp.json` yapılandırması, araç onayı ve güvenlik notları.
4. [Figma: Set up the remote server](https://developers.figma.com/docs/figma-mcp-server/remote-server-installation/) *(article)* — Uzak sunucu kurulumu, eklenti ve OAuth girişi.
5. [Figma: Tools and prompts](https://developers.figma.com/docs/figma-mcp-server/tools-and-prompts/) *(article)* — Tasarımdan kod araçları, değişkenler ve Code Connect.
6. [microsoft/playwright-mcp](https://github.com/microsoft/playwright-mcp) *(repo)* — Erişilebilirlik snapshot'ı, araçlar, profil modları ve CLI ile karşılaştırma.
7. [Next.js: Connecting coding agents to the Next.js MCP server](https://nextjs.org/docs/app/guides/mcp) *(article)* — `/_next/mcp` uç noktası ve `next-devtools-mcp` araçları.
8. [Simon Willison: The lethal trifecta for AI agents](https://simonwillison.net/2025/Jun/16/the-lethal-trifecta/) *(article)* — Özel veri, güvenilmeyen içerik ve dış iletişim üçlüsü. Haziran 2025.
