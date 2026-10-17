---
title: "Web Nasıl Çalışır"
description: "Tarayıcı, HTTP istek/yanıt ve DevTools."
lastVerified: "2026-10-17"
translationKey: "web-fundamentals/how-the-web-works"
---

## İstemci ve Sunucu

Web, iki tarafın konuşmasıdır. **İstemci** (client) sizin cihazınız ve üzerindeki tarayıcıdır. **Sunucu** (server) sayfaları ve uygulamaları barındıran bilgisayardır. Bir sayfayı açtığınızda sayfanın kodunun bir kopyası sunucudan tarayıcınıza iner, tarayıcı da onu ekrana çizer.[^1]

Bir web sitesi tek bir dosya değildir. **Kod** dosyaları (HTML, CSS, JavaScript) ve **asset**'ler (görsel, video, font, PDF) ayrı ayrı indirilir ve tarayıcıda birleştirilir.[^1]

## Adres Çubuğuna Yazdığınızda

`https://example.com` yazıp Enter'a bastığınızda kabaca şu olur:[^1][^2]

1. Tarayıcı yazdığınızın bir arama mı yoksa adres mi olduğuna karar verir.
2. **DNS** ile alan adının arkasındaki sunucunun IP adresini bulur.
3. Sunucuyla bir bağlantı açar; adres `https` ise bağlantı **TLS** ile şifrelenir.
4. Bir **HTTP isteği** gönderir.
5. Sunucu bir **HTTP yanıtı** döner; veri küçük parçalar (**packet**) halinde gelir ve tarayıcı bunları doğru sırayla birleştirir.
6. Tarayıcı HTML'i okur, gereken CSS, JavaScript ve görselleri de ister ve sayfayı çizer.

Aşağıdaki bölümler bu adımları tek tek açar.

## URL'nin Parçaları

Örnek: `https://www.example.com:443/urunler/kitap?renk=mavi&sayfa=2#yorumlar`[^3]

| Parça | Örnek | Ne işe yarar |
| :-- | :-- | :-- |
| Scheme | `https` | Hangi protokolle isteneceği |
| Domain | `www.example.com` | Hangi sunucuya gidileceği |
| Port | `443` | Sunucudaki kapı; standart portlarda (HTTP 80, HTTPS 443) yazılmaz |
| Path | `/urunler/kitap` | Sunucudaki kaynağın yolu |
| Parametreler | `?renk=mavi&sayfa=2` | Sunucuya gönderilen anahtar/değer çiftleri |
| Anchor | `#yorumlar` | Sayfa içindeki bir yer; **sunucuya hiç gönderilmez** |

## DNS

**DNS** (Domain Name System) internetin adres defteridir: `example.com` gibi okunabilir bir adı, sunucunun `192.0.2.172` gibi IP adresine çevirir.[^1] Büyük siteler birden fazla sunucuda çalıştığı için aynı ad, bulunduğunuz yere göre farklı bir IP'ye çıkabilir.[^1]

Tarayıcı cevabı önce kendi önbelleğinde, sonra işletim sisteminde arar. Orada yoksa soru bir **recursive resolver**'a (çoğunlukla internet sağlayıcınızın ya da `1.1.1.1`, `8.8.8.8` gibi bir servisin) gider. Resolver sırasıyla root sunucusuna, `.com` gibi uzantının sunucusuna ve son olarak alan adının **authoritative** sunucusuna sorar; asıl kayıt oradadır.[^4]

Her kaydın bir **TTL**'i (time to live) vardır ve önbellekler cevabı bu süre boyunca saklar. DNS kaydını değiştirdiğinizde herkesin hemen yeni adresi görmemesi bundandır. "Böyle bir alan adı yok" cevabı da önbelleğe alınır.[^5]

## HTTP İstek ve Yanıt

**HTTP**, istemciyle sunucunun konuştuğu dildir. İsteği her zaman istemci başlatır.[^6] Her mesajın bir başlangıç satırı, **header**'ları, boş bir satırı ve isteğe bağlı bir **body**'si vardır.[^7]

```http
GET /urunler HTTP/1.1
Host: example.com
Accept-Language: tr
```

```http
HTTP/1.1 200 OK
Content-Type: text/html
Content-Length: 29769

<!doctype html>…
```

İstek satırında bir **method** (ne yapılacağı), bir hedef (path) ve protokol sürümü bulunur. En sık kullanılanlar veri almak için `GET`, veri göndermek için `POST`'tur; body genellikle yalnızca `POST`, `PUT` ve `PATCH` isteklerinde olur.[^7]

Yanıttaki **status code** sonucun ne olduğunu söyler. İlk rakam sınıfını belirler:[^8]

| Kod | Anlamı | Sık görülen |
| :-- | :-- | :-- |
| `1xx` | Bilgi | |
| `2xx` | Başarılı | `200 OK` |
| `3xx` | Yönlendirme | `301` kalıcı taşındı, `304` önbellekteki kopya hâlâ geçerli |
| `4xx` | İstemci hatası | `404` bulunamadı, `403` erişim yok |
| `5xx` | Sunucu hatası | `500` sunucu ne yapacağını bilemedi |

HTTP **stateless**'tır: iki istek arasında kendiliğinden bir bağ yoktur. Giriş yapmış kalmanız ya da sepetinizin durması **cookie**'ler sayesindedir.[^6] Tarayıcı ile sunucu arasında önbellek, yük dengeleyici ya da güvenlik katmanı gibi **proxy**'ler de olabilir.[^6]

Mesajların anlamı sürümler arasında aynı kalır; değişen, verinin taşınma biçimidir. 2024'te mobilde ana sayfaların %70'i HTTP/2, %9'u HTTP/3, %21'i HTTP/1.1 ile sunuluyordu.[^9]

## HTTPS

**HTTPS**, HTTP'nin TLS ile şifrelenmiş halidir; araya giren kimse içeriği okuyamaz ya da değiştiremez.[^10] Artık varsayılandır: 2024'te mobilde isteklerin %98'i şifreli bağlantı üzerinden geliyordu.[^11]

Kamera, mikrofon ve service worker gibi birçok tarayıcı özelliği yalnızca **secure context**'te, yani HTTPS'te çalışır. `http://localhost` bu kurala dahildir, bu yüzden geliştirirken sertifikaya ihtiyacınız olmaz.[^12]

## Tarayıcı Sayfayı Nasıl Çizer

HTML gelince tarayıcı onu okuyup bir ağaç yapısına, **DOM**'a (Document Object Model) çevirir; her element, attribute ve metin bir **node** olur.[^13] Okurken karşılaştığı `<link>`, `<script>` ve `<img>` için yeni istekler atar.[^13]

Ardından CSS kurallarını ilgili node'lara bağlar, her kutunun boyutunu ve yerini hesaplar (**layout**) ve pikselleri ekrana boyar (**paint**). JavaScript de bu sırada çalışır ve DOM'u değiştirerek görüntüyü etkileyebilir. Ekran okuyucular için DOM'dan bir **erişilebilirlik ağacı** da üretilir.[^13]

> [!TIP]
>
> Chrome gibi tarayıcılar sekmeleri çoğunlukla ayrı süreçlerde çalıştırır. Bir sekme donduğunda diğerlerinin çalışmaya devam etmesi bundandır.[^14]

## DevTools

Tarayıcının geliştirici araçları, bu derste anlatılan her şeyi gözünüzle görmenizi sağlar. Windows'ta `Ctrl` + `Shift` + `I` ya da `F12`, macOS'ta `⌘` + `⌥` + `I` ile açılır; bir elemente sağ tıklayıp **Inspect** demek de olur. Safari'de önce ayarlardan Develop menüsünü açmak gerekir.[^15]

| Panel | Ne için |
| :-- | :-- |
| **Elements** | Canlı DOM'u ve uygulanan CSS'i görmek, anında düzenlemek |
| **Console** | Hataları okumak ve sayfada JavaScript çalıştırmak |
| **Sources** | JavaScript'te breakpoint koyup adım adım ilerlemek |
| **Network** | Sayfanın attığı her isteği, durumunu, boyutunu ve süresini görmek |

Network panelinde bir isteğe tıklayınca **Headers** sekmesinde istek ve yanıt header'larını, **Response** sekmesinde sunucunun döndüğü içeriği görürsünüz. **Status** sütunu yanıt kodunu, **Initiator** isteği neyin başlattığını gösterir.[^16]

> [!DO]
>
> - Paneli sayfayı yüklemeden önce açın; DevTools yalnızca açıkken olan istekleri kaydeder.[^16]
> - İlk kez gelen bir kullanıcıyı görmek için **Disable cache**'i işaretleyin.[^17]
> - Yönlendirmelerde istekler kaybolmasın diye **Preserve log**'u açın.[^17]
> - Yavaş bağlantıyı denemek için throttling menüsünden 3G seçin.[^16]

## Detaylı Öğrenmek İçin

- **Sayfa yüklemenin tamamı:** MDN'in DNS'ten paint'e kadar her adımı performans açısından anlatan rehberi.[^18]
- **Tarayıcının içi:** Mariko Kosaka'nın Chrome'un mimarisini çizimlerle anlatan dört bölümlük yazı dizisi.[^14][^2]
- **Ağ katmanı:** Ilya Grigorik'in TCP, TLS ve HTTP/2'yi anlatan ücretsiz kitabı *High Performance Browser Networking*.[^19]
- **DNS'i elle dene:** Julia Evans'ın Mess With DNS sitesi; kendi alt alan adınızı alıp kayıt ekleyebilir, gelen sorguları canlı izleyebilirsiniz.[^20]
- **Konuşma:** Julia Evans'ın RubyConf Mini 2022'de DNS'i ve zor konuları öğrenmeyi anlattığı açılış konuşması.[^5]

## Kaynaklar

1. [MDN: How the web works](https://developer.mozilla.org/en-US/docs/Learn_web_development/Getting_started/Web_standards/How_the_web_works) *(doc)* — İstemci ve sunucu, adres yazınca olan adımlar, DNS, TCP/IP, packet'lar, kod ve asset dosyaları.
2. [Mariko Kosaka: Inside look at modern web browser, part 2](https://developer.chrome.com/blog/inside-browser-part2) *(article)* — Adres mi arama mı kararı, DNS ve TLS, yanıtın okunması ve sayfanın renderer'a teslimi.
3. [MDN: What is a URL?](https://developer.mozilla.org/en-US/docs/Learn_web_development/Howto/Web_mechanics/What_is_a_URL) *(doc)* — Scheme, domain, port, path, parametreler ve sunucuya gitmeyen anchor.
4. [Cloudflare Learning: What is DNS?](https://www.cloudflare.com/learning/dns/what-is-dns/) *(article)* — Recursive resolver, root, TLD ve authoritative sunucu; tarayıcı ve işletim sistemi önbelleği.
5. [Julia Evans: Learning DNS (RubyConf Mini 2022)](https://www.youtube.com/watch?v=tsxjNsFu_2g) *(video)* — Açılış konuşması. Resolver önbellekleri, TTL ve "yok" cevabının da önbelleğe alınması; konuşmanın yazılı özeti [blogunda](https://jvns.ca/blog/2023/05/08/new-talk-learning-dns-in-10-years/).
6. [MDN: Overview of HTTP](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Overview) *(doc)* — İsteği her zaman istemcinin başlatması, stateless yapı ve cookie'ler, proxy'ler.
7. [MDN: HTTP messages](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Messages) *(doc)* — İstek ve yanıtın yapısı: başlangıç satırı, method, header, body.
8. [MDN: HTTP response status codes](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Status) *(doc)* — Beş status code sınıfı ve her kodun anlamı.
9. [Web Almanac 2024: HTTP](https://almanac.httparchive.org/en/2024/http) *(research)* — Robin Marx. Mobil ana sayfalarda %70 HTTP/2, %9 HTTP/3, %21 HTTP/1.1.
10. [MDN: HTTPS](https://developer.mozilla.org/en-US/docs/Glossary/HTTPS) *(doc)* — HTTP'nin TLS ile şifrelenmiş hali.
11. [Web Almanac 2024: Security](https://almanac.httparchive.org/en/2024/security) *(research)* — Mobilde isteklerin %98'i TLS üzerinden.
12. [MDN: Secure contexts](https://developer.mozilla.org/en-US/docs/Web/Security/Defenses/Secure_Contexts) *(doc)* — Hangi özelliklerin HTTPS istediği ve `localhost`'un güvenli sayılması.
13. [MDN: How browsers load websites](https://developer.mozilla.org/en-US/docs/Learn_web_development/Getting_started/Web_standards/How_browsers_load_websites) *(doc)* — HTML'den DOM'a, CSS'in uygulanması, layout, paint, JavaScript ve erişilebilirlik ağacı.
14. [Mariko Kosaka: Inside look at modern web browser, part 1](https://developer.chrome.com/blog/inside-browser-part1) *(article)* — Browser, renderer ve GPU süreçleri; her sekmenin neden ayrı süreçte çalıştığı.
15. [MDN: What are browser developer tools?](https://developer.mozilla.org/en-US/docs/Learn_web_development/Howto/Tools_and_setup/What_are_browser_developer_tools) *(doc)* — DevTools'u açmak; Elements, Console ve Sources panelleri.
16. [Chrome DevTools: Inspect network activity](https://developer.chrome.com/docs/devtools/network) *(doc)* — Network panelinin sütunları, Headers ve Response sekmeleri, throttling.
17. [Chrome DevTools: Network features reference](https://developer.chrome.com/docs/devtools/network/reference) *(doc)* — Disable cache ve Preserve log.
18. [MDN: Populating the page: how browsers work](https://developer.mozilla.org/en-US/docs/Web/Performance/Guides/How_browsers_work) *(doc)* — DNS, TCP, TLS, parsing, layout, paint ve compositing; performans açısından.
19. [Ilya Grigorik: High Performance Browser Networking](https://hpbn.co/) *(article)* — Ücretsiz okunabilen kitap: TCP, UDP, TLS, HTTP/1.x, HTTP/2 ve tarayıcı API'leri.
20. [Mess With DNS](https://messwithdns.net/) *(doc)* — Wizard Zines'in DNS kayıtlarıyla güvenle deney yapma aracı.
