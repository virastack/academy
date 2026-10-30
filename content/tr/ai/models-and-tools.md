---
title: "Modeller ve araçlar"
description: "Model türleri, güçlü ve zayıf yönleri; sohbet, editör ve terminal tabanlı araçlar."
lastVerified: "2026-10-26"
translationKey: "ai/models-and-tools"
---

Frontend geliştirmesinde yapay zekâ iki katmandan oluşur:

- **Model:** Kodu üreten yapay zekâdır *(örn: [!claude], [!gpt], [!gemini] sürümleri)*.
- **Araç:** Dosyaları okuyan, projeyi anlayan ve komut çalıştıran arayüzdür *(örn: [!cursor], [!claudeCode])*.

Yazılan kodun kalitesini büyük ölçüde seçilen model belirler. Araç da fark yaratır: aynı model farklı araçlarda farklı sonuç verebilir, çünkü her araç modele farklı bağlam gönderir. Bunu [Prompt ve Context Engineering](/academy/ai/prompt-and-context-engineering) rehberinde göreceksiniz.

Araç tarafındaki asıl ayrım sohbet ile agent arasındadır. `useCart` hook'unu bir sohbet aracına yazdırırsanız kodu kendiniz kopyalayıp projeye eklersiniz. Bir agent *([!claudeCode], [!cursor]'ın agent modu)* aynı hook'u doğrudan dosyaya yazar, testi çalıştırır ve hata çıkarsa kendisi düzeltir[^1].

## Yapay zekâ şirketleri ve model sıralaması

Aşağıdaki sıralama tabloları, Arena AI sitesinin WebDev sıralamasındaki Frontend filtresinden 16 Ekim 2026 tarihindeki veriler alınarak hazırlanmıştır[^2]. Arena, kullanıcıların iki modelin yaptığı arayüzü karşılaştırıp oy verdiği bir kodlama sıralamasıdır. Yeni testler ve oylamalarla sıralama günlük değişebilir; en güncel sonuçlar için siteyi kontrol edin.

### Şirketler sıralaması

Arena AI verileri geliştirici şirket bazında incelendiğinde *(16 Ekim 2026, 145 model genelinde 782.515 oy)* tablo şu şekildedir:

| Sıra | Şirket | En iyi modeli | Model skoru |
| --- | --- | --- | ---: |
| 1. | [!anthropic] Anthropic | **Claude Opus 5.5** | 1.850 |
| 2. | [!openai] OpenAI | **GPT-6 Astra** | 1.799 |
| 3. | [!google] Google | **Gemini 4 Argon** | 1.688 |
| 4. | [!qwen] Alibaba | **Qwen 3.8** | 1.686 |
| 5. | [!meta] Meta | **Muse Spark 1.3** | 1.673 |

### Model sıralaması

Aynı değerlendirmenin model bazlı sıralaması *(16 Ekim 2026, 145 model genelinde 782.515 oy)* ise şu şekildedir:

| Sıra | Model | Skor | Fiyat *(girdi / çıktı, $ / 1M token)* |
| --- | --- | --- | ---: |
| 1. | [!claude] **Claude Opus 5.5**<br>Anthropic | 1.850 | $4 / $20 |
| 2. | [!claude] **Claude Sonnet 5.5**<br>Anthropic | 1.807 | $2 / $10 |
| 3. | [!openai] **GPT-6 Astra**<br>OpenAI | 1.799 | $10 / $50 |
| 4. | [!claude] **Claude Fable 5.1**<br>Anthropic | 1.775 | $10 / $50 |
| 5. | [!openai] **GPT-6.1 Sol**<br>OpenAI | 1.769 | $2 / $10 |
| 8. | [!gemini] **Gemini 4 Argon**<br>Google | 1.688 | $2 / $10 |
| 10. | [!qwen] **Qwen 3.8**<br>Alibaba | 1.686 | $2 / $6 |
| 13. | **Muse Spark 1.3**<br>Meta | 1.673 | $1.25 / $4.25 |
| 29. | [!claude] **Claude Haiku 5.5**<br>Anthropic | 1.603 | $0.10 / $0.50 |

Tabloyu okurken iki şeye dikkat edin:

- Skorlar çoğunlukla modellerin en yüksek effort ayarıyla *(max veya xhigh)* ölçülmüş sonuçlardır. Günlük kullanımda daha düşük ayarla skor düşebilir[^2].
- Aynı modelin genel WebDev sıralamasındaki veya React filtresindeki sırası farklı olabilir.

Frontend geliştirmede [!claude] modelleri sıralamanın üstünde duruyor. Bu ailede [!claude] **Sonnet 5.5**, fiyat ve performans dengesini kuruyor.

Anthropic'e göre **Sonnet 5.5**, **Opus 5.5**'in daha hızlı ve daha ucuz tamamlayıcısıdır. **Opus 5.5** dikkatli karar gerektiren karmaşık işler için, **Sonnet 5.5** ise iyi tanımlanmış günlük görevler ve hata düzeltme için daha uygundur[^3].

## Model katmanları

Modeller güç, gecikme süresi ve maliyet ekseninde üç katmana ayrılır.

- **En güçlü katman.** Karmaşık akıl yürütme, sıfırdan sistem mimarisi tasarlama ve zorlu hata ayıklama içindir. Maliyetli ve görece yavaştır. Örnek: [!claude] **Opus 5.5**, **GPT-6 Astra**.
- **Dengeli katman.** Günlük bileşen ve hook yazımı, feature geliştirme ve kod inceleme için ana tercihtir. Hız, maliyet ve kalite dengesi en yüksek katmandır. Örnek: [!claude] **Sonnet 5.5**, **GPT-6.1 Sol**.
- **Hızlı ve ucuz katman.** Düşük gecikme süresi gerektiren mekanik işler, toplu import güncellemeleri, tip düzeltmeleri ve lint hatalarını gidermek içindir. Örnek: [!claude] **Haiku 5.5**, **GPT-6 Luna** *($0.10 / $0.50)*.

Düşünen *(reasoning)* modeller çok adımlı, karmaşık işlerde güçlüdür ama genelde daha yavaş ve pahalıdır. Küçük modeller daha hızlı ve ucuzdur[^4].

> [!TIP]
>
> Basit işlerde büyük bir model seçmek hem daha çok token harcar hem de token başı ücreti yüksek olduğu için aynı işi daha pahalıya getirir. Çıktı token'ı girdiden genellikle 3-5 kat daha pahalıdır[^5][^6]. Bu yüzden modeli işin zorluğuna göre seçin.

## Model mi, effort mi?

**Model**, yeteneğin sınırını belirler. **Effort** ise modelin işe ne kadar emek harcayacağını belirler: kaç dosya okuyacağını, ne kadar doğrulama yapacağını[^6]. Çoğu iş için varsayılan ayar yeterlidir.

Sonuç yanlış çıktıysa kendinize şunu sorun: model bilmiyor mu, yeterince uğraşmadı mı? Örneğin `CartSummary` toplamı yanlış hesaplıyor:

- Model ilgili dosyayı okumadan yüzeysel bir yama yapıp bıraktıysa sorun **effort**'tur. Effort'u artırın.
- Dosyaları okuyup testi çalıştırdığı hâlde hâlâ yanlış çözüyorsa sorun **modeldir**. Bir üst katmana geçin[^6].

Google'ın [!gemini] 3 rehberi de benzer bir şey söylüyor: model zaten kendi içinde düşünüyor. "Çok iyi düşün" demek performansı artırabilir ama fazladan düşünme token'ı harcatır[^7].

## Araç türleri

Araçlar genelde çalıştıkları yere göre üçe ayrılır. Sınırlar bulanıklaşıyor: [!claudeCode] terminalin yanında IDE eklentisi, masaüstü ve web olarak da çalışır[^8].

| Araç türü | Nasıl çalışır | Örnek | Ne zaman |
| --- | --- | --- | --- |
| Sohbet | Tarayıcıda veya uygulamada konuşursunuz, kodu kendiniz kopyalarsınız | [!claude][!chatGpt][!gemini] | Fikir almak, kavram öğrenmek, kısa kod parçası |
| Editör | Kod editörünün içinde çalışır, öneri, sohbet ve agent modu sunar | [!cursor][!copilot] | Günlük kodlama, değişikliği diff olarak görüp onaylamak |
| Terminal | Projeyi okur, dosyaları düzenler, komut ve test çalıştırır | [!claudeCode][!codex][!geminiCli] | Çok dosyalı işler, test yazıp çalıştırmak, hata ayıklama döngüsü |

> [!WARNING]
>
> API anahtarını, `.env` içeriğini ve müşteri verisini sohbete yapıştırmayın. İş yerinde şirketin yapay zekâ politikasına uyun.

## Gerçek hayat senaryosu: e-ticaret sepet akışı

Bu katman mantığını ve model tercihlerini, bir e-ticaret sitesinin sepet ve ödeme sistemini geliştirirken şöyle uygulayabilirsiniz.

| İş | Katman ve araç | Neden |
| --- | --- | --- |
| Sepet ve ödeme mimarisini tasarlamak | En güçlü katman ([!claude] **Opus**) + terminal *(CLI)* veya sohbet | Stok tutarlılığı, state yönetimi ve güvenlik adımlarını doğru kurgulamak derin akıl yürütme gerektirir. |
| `CartItem` bileşenini ve `useCart` hook'unu yazmak | Dengeli katman ([!claude] **Sonnet**) + editör *([!cursor] veya [!copilot])* | Günlük arayüz geliştirmede yüksek kod kalitesini hızlı ve makul maliyetle almak esastır. |
| 30 dosyada import yollarını güncellemek | Hızlı ve ucuz katman ([!claude] **Haiku**) + terminal *(CLI)* veya editör | Mantıksal risk taşımayan mekanik güncellemeleri pahalı modellere bırakmamak gerekir. |

## Modelin sınırları

Model ne kadar güçlü olursa olsun dört sınırı vardır. Bunları bilmek, çıktıya ne kadar güveneceğinizi belirler.

- **Bilgisi eğitim tarihinde kalır.** Kurulu kütüphane modelin bildiğinden yeniyse eski API'yi önerir. Next.js'teki örnekleri [AI agent'larla Next.js](/academy/nextjs/ai-agents) dersinde gördünüz. Çözüm, güncel dokümanı bağlama vermektir.
- **Uydurabilir.** Var olmayan bir prop, fonksiyon ya da paket önerebilir. 16 modelle üretilen 576.000 kod örneğini inceleyen bir çalışmada ticari modeller en az %5,2, açık modeller %21,7 oranında var olmayan paket önerdi.[^9] Saldırganlar bu isimlerle sahte paket yayınlayabilir *(bkz. [Secret ve bağımlılık güvenliği](/academy/auth-security/secrets-and-dependencies))*. Önerilen her paketi kurmadan önce npm'de kontrol edin.
- **Emin görünmek doğru olmak demek değildir.** Model yanlış cevabı da aynı tonla yazar. [!anthropic], modele *"emin değilsen bilmiyorum de"* izni vermenin ve iddialarına kaynak istemenin uydurmayı belirgin şekilde azalttığını söylüyor.[^10]
- **Çalışan uygulamayı görmez.** Tarayıcı, test ya da ekran görüntüsü vermezseniz arayüzün gerçekte nasıl göründüğünü bilemez. Ona kendi işini kontrol edebileceği bir yol verin *(bkz. [Test, eval ve code review](/academy/ai/testing-evals-and-code-review))*.

> [!DONT]
>
> - Açıklayamadığınız kodu commit etmek.
> - Ödeme, yetkilendirme ve kişisel veri koduna incelemeden onay vermek.
> - Önerilen paketi adına bakmadan kurmak.

## Kaynaklar

1. [Addy Osmani: AI Coding Agent](https://addyosmani.com/agentic-engineering/ai-coding-agent/) *(article)* — Kodu yalnızca öneren sohbet ile kodu yazıp çalıştıran ve düzelten kodlama agent'ı arasındaki fark.
2. [Arena: Code Arena | WebDev, Frontend](https://arena.ai/leaderboard/code/webdev/frontend) *(research)* — Şirket ve model sıralamalarının alındığı frontend kodlama sıralaması.
3. [Anthropic: Claude Sonnet 5.5](https://www.anthropic.com/claude-sonnet-5-5) *(article)* — Sonnet 5.5'in Opus 5.5 karşısındaki yeri: hız, maliyet ve günlük görevler.
4. [OpenAI: Prompt engineering](https://developers.openai.com/api/docs/guides/prompt-engineering) *(doc)* — Düşünen, büyük ve küçük modeller arasındaki ödünler ("Choosing a model" bölümü).
5. [Addy Osmani: Tokens](https://addyosmani.com/agentic-engineering/tokens/) *(article)* — Girdi ve çıktı token'ı, fiyatlandırma ve maliyetle ilişkisi.
6. [Anthropic: Choosing a Claude model and effort level in Claude Code](https://claude.com/blog/claude-model-and-effort-level-in-claude-code) *(article)* — Model ile effort'un neyi değiştirdiği, hangisine ne zaman dokunulacağı.
7. [Google: Prompt design strategies](https://ai.google.dev/gemini-api/docs/prompting-strategies) *(doc)* — Gemini 3'ün düşünme davranışı ("Enhancing reasoning and planning" bölümü).
8. [Anthropic: Claude Code Overview](https://code.claude.com/docs/en/overview) *(doc)* — Claude Code'un terminal, IDE, masaüstü ve web'de çalıştığı yerler.
9. [USENIX Security: We Have a Package for You! A Comprehensive Analysis of Package Hallucinations by Code Generating LLMs](https://www.usenix.org/conference/usenixsecurity25/presentation/spracklen) *(research)* — Spracklen ve diğerleri, USENIX Security 2025. 16 modelde var olmayan paket önerme oranları.
10. [Claude Platform: Reduce hallucinations](https://platform.claude.com/docs/en/test-and-evaluate/strengthen-guardrails/reduce-hallucinations) *(doc)* — "Bilmiyorum" izni, alıntıyla temellendirme ve kaynakla doğrulama.
