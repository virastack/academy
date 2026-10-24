---
title: "CI/CD (GitHub Actions)"
description: "Lint, test ve Docker işleriyle deploy hattı, secret'lar ve ortamlar."
lastVerified: "2026-10-22"
translationKey: "production/cicd"
---

## Üç kavram

**Sürekli entegrasyon** *(Continuous Integration, CI)*: Ekipteki herkes değişikliğini en az günde bir kez ortak koda birleştirir ve her birleştirme otomatik bir build ve testle doğrulanır. [Martin Fowler](https://martinfowler.com/) bu pratiği anlatırken build'i hızlı tutmayı vurgular: geri bildirim on dakikayı aşarsa insanlar beklemeyi bırakır.[^1]

**Sürekli teslim** *(Continuous Delivery)*: Yazılım her an canlıya çıkarılabilecek durumdadır. Canlıya çıkmak bir iş kararıdır, teknik bir macera değil.[^2]

**Sürekli deploy** *(Continuous Deployment)*: Hattan geçen her değişiklik insan onayı olmadan otomatik olarak canlıya çıkar. Fowler sürekli deploy'u sürekli teslimin bir adım ötesi olarak tanımlar; sürekli teslim yapmak için her değişikliği canlıya çıkarmak zorunda değilsiniz.[^2]

| | Otomatik test | Her an yayınlanabilir | Otomatik yayın |
| :-- | :-- | :-- | :-- |
| Sürekli entegrasyon | Evet | Gerekmez | Hayır |
| Sürekli teslim | Evet | Evet | Hayır, bir onayla |
| Sürekli deploy | Evet | Evet | Evet |

## Deploy hattı

Fowler'ın tarif ettiği **deploy hattı** *(deployment pipeline)* build'i aşamalara böler. İlk aşama hızlıdır *(derleme, lint, birim testleri)* ve geliştiriciye dakikalar içinde haber verir. Sonraki aşamalar daha yavaş ama daha kapsamlıdır *(uçtan uca testler, production benzeri ortamda kontrol)*. Bir aşama düşerse sonrakiler çalışmaz.[^3]

Bu rehberin projesindeki hat:

```text
quality (lint, tip kontrolü) ──┐
                               ├──> docker (imaj build, smoke test) ──> deploy
e2e (Playwright testleri) ─────┘
```

`quality` ve `e2e` paralel çalışır. İkisi de geçerse `docker` imajı oluşturur ve gerçekten açılıp açılmadığını dener. Deploy son aşamadır.

## İş akışı

[!github] Actions iş akışları `.github/workflows/` klasöründeki YAML dosyalarıdır:

```yaml
# .github/workflows/ci.yml
name: CI
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: ${{ github.event_name == 'pull_request' }}

permissions:
  contents: read

jobs:
  quality:
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      - uses: actions/checkout@v7
      - uses: actions/setup-node@v7
        with:
          node-version: lts/*
          cache: npm
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck
```

`typecheck` betiği `next typegen && tsc --noEmit`'tir. `next typegen` sayfa ve route tiplerini üretir; `tsc` bunlarla birlikte tüm projeyi kontrol eder *(bkz. [tsconfig ve strict mod](/academy/typescript/tsconfig-and-strict-mode))*. Aynı kontrollerin editör ve commit aşamalarındaki karşılığı [Kod kalitesi ve ekip standartları](/academy/architecture/code-quality) dersinde.

> [!NOTE]
>
> Bu rehber yazılırken `actions/checkout` ve `actions/setup-node`'un güncel ana sürümü v7, `actions/cache` v6'dır. Bazı dokümanlardaki örnekler hâlâ eski sürümleri gösterir. Sürümü kopyalamadan önce eylemin sürüm sayfasına bakın.

## Uçtan uca testler ve önbellek

```yaml
  e2e:
    runs-on: ubuntu-latest
    timeout-minutes: 15
    steps:
      - uses: actions/checkout@v7
      - uses: actions/setup-node@v7
        with:
          node-version: lts/*
          cache: npm
      - run: npm ci
      - name: Restore Next.js build cache
        uses: actions/cache@v6
        with:
          path: .next/cache
          key: ${{ runner.os }}-nextjs-${{ hashFiles('package-lock.json') }}-${{ hashFiles('app/**', 'components/**', 'lib/**') }}
          restore-keys: |
            ${{ runner.os }}-nextjs-${{ hashFiles('package-lock.json') }}-
      - run: npx playwright install --with-deps chromium
      - run: npm test
```

İki farklı önbellek var:

- `setup-node`'un `cache: npm` ayarı npm'in indirdiği paketleri saklar.
- `actions/cache` Next.js'in `.next/cache` klasörünü saklar. Next.js dokümanı bu klasörü CI'da korumayı önerir; yoksa her build sıfırdan başlar ve Next.js "No Cache Detected" hatası gösterebilir.[^4] Anahtar paket kilidi ve kaynak dosyaların özetinden oluşur. Kaynak değişince tam eşleşme bulunmaz ve `restore-keys` en yakın eski önbelleği geri yükler.

Playwright tarafının ayrıntıları *(raporu yüklemek, işçi sayısı, sharding)* [CI'da çalıştırma](/academy/playwright/running-in-ci) dersinde.

## İmajı denemek

```yaml
  docker:
    runs-on: ubuntu-latest
    timeout-minutes: 15
    needs: [quality, e2e]
    steps:
      - uses: actions/checkout@v7
      - name: Build image
        run: docker build -t order-panel:${{ github.sha }} .
      - name: Smoke test
        run: |
          docker run -d --name app -p 3000:3000 \
            -e APP_ENV=preview -e APP_VERSION=${{ github.sha }} \
            order-panel:${{ github.sha }}
          for i in $(seq 1 30); do
            curl -fsS http://localhost:3000/api/health && exit 0
            sleep 1
          done
          docker logs app
          exit 1
```

- `needs` bu işi diğer ikisi geçene kadar bekletir.
- İmaj etiketi commit SHA'sıdır. Hangi imajın hangi koddan üretildiği her zaman bellidir.
- **Smoke test**, yani "duman testi", imajın en temel şekilde çalıştığını kontrol eder: konteyner açılıyor mu, sağlık uç noktası yanıt veriyor mu? Eksik bir dosya ya da geçersiz bir ortam değişkeni burada yakalanır *(bkz. [Deploy seçenekleri](/academy/production/deployment-options))*.

## Eşzamanlılık ve izinler

`concurrency` aynı gruptaki çalıştırmaları sınırlar. `cancel-in-progress: true` aynı gruba yeni bir çalıştırma geldiğinde eskisini iptal eder.[^5] Projede bu yalnızca pull request'lerde açıktır: aynı dala art arda üç push gelirse yalnızca sonuncusu test edilir. `main`'deki çalıştırmalar ise yarıda kesilmez.

`permissions` iş akışına verilen `GITHUB_TOKEN`'ın yetkisini belirler. GitHub'ın güvenlik rehberi bu token'a gereken en az yetkinin verilmesini önerir.[^6] Yalnızca kodu okuyan bir hat için `contents: read` yeterlidir; bir iş daha fazlasına ihtiyaç duyuyorsa *(örneğin bir paket yayımlamak)* izni yalnızca o işe verin.

## Secret'lar

API anahtarları gibi değerler depoda değil, GitHub'da **secret** olarak saklanır. GitHub secret'ları şifreleyerek saklar ve bir iş akışı bir secret'ı yalnızca açıkça kullandığında okuyabilir. Loglara yazılan secret değerleri otomatik maskelenir, ama GitHub bunun garanti olmadığını söyler: değer dönüştürülürse *(örneğin base64'e çevrilirse)* maske tutmayabilir.[^7]

```yaml
      - name: Deploy
        run: ./scripts/deploy.sh
        env:
          DEPLOY_TOKEN: ${{ secrets.DEPLOY_TOKEN }}
```

Secret'ların nereden sızdığı ve nasıl korunacağı [Secret ve bağımlılık güvenliği](/academy/auth-security/secrets-and-dependencies) dersinde.

> [!WARNING]
>
> Fork'tan açılan pull request'ler varsayılan olarak secret'lara erişemez ve token'ları salt okunurdur.[^8] Bunu aşmak için `pull_request_target` kullanmayın; o tetikleyici fork'un kodunu deponuzun yetkileriyle çalıştırabilir.

## Ortamlar ve korunan deploy

GitHub **ortamları** *(environments)* `preview`, `production` gibi deploy hedefleri tanımlar. Her ortamın kendi secret'ları ve koruma kuralları olur. Bir iş bir ortama bağlandığında, koruma kuralları geçmeden çalışmaya başlamaz ve ortamın secret'larını ancak çalışmaya başladıktan sonra görür.[^9] Örneğin `production` için "gerekli onaylayıcılar" tanımlarsanız, deploy bir ekip üyesi onaylayana kadar bekler. Sürekli teslimdeki "bir onayla yayın" adımı tam olarak budur.

```yaml
  deploy:
    runs-on: ubuntu-latest
    needs: [docker]
    if: github.ref == 'refs/heads/main'
    environment:
      name: production
      url: https://siparis.example.com
    concurrency: production
    steps:
      - uses: actions/checkout@v7
      - name: Deploy
        run: ./scripts/deploy.sh
        env:
          DEPLOY_TOKEN: ${{ secrets.DEPLOY_TOKEN }}
          APP_VERSION: ${{ github.sha }}
```

- `if` deploy'u yalnızca `main`'de çalıştırır; pull request'ler deploy edilmez.
- `concurrency: production` aynı anda iki deploy'un çalışmasını önler.[^5]
- `deploy.sh` platformunuza göre değişir: imajı bir kayıt defterine göndermek, sunucuya bağlanıp yeni imajı başlatmak ya da platformun CLI'ını çağırmak.

[!vercel] gibi Git entegrasyonu olan platformlarda bu iş gerekmez: platform her push'ta kendisi build alır, pull request'e önizleme adresi yazar. GitHub Actions hattı yine de lint, tip ve test kapısı olarak kalır; dal koruma kurallarıyla `main`'e birleştirmeyi bu kontrollerin geçmesine bağlayın.

## Eylemleri sabitlemek

`actions/checkout@v7` bir etikettir ve etiketler taşınabilir. Bir eylemin sahibinin hesabı ele geçirilip etiket başka bir commit'e yönlendirilirse, iş akışınız o kodu çalıştırır. GitHub bu yüzden üçüncü parti eylemleri tam commit SHA'sına sabitlemeyi önerir.[^6] GitHub şu anda önizleme aşamasında olan iş akışı kilit dosyalarını *(`.github/workflows/actions.lock`)* da bu sorunun daha kapsamlı çözümü olarak sunuyor.[^10]

> [!TIP]
>
> GitHub'ın kendi eylemleri *(`actions/*`)* için etiket kullanmak yaygındır. Topluluk eylemleri için SHA'ya sabitleyin ve Dependabot ile güncel tutun.

## Kendin dene

- Projenize `ci.yml`'i ekleyip bir pull request açın. Lint hatası olan bir commit atıp hangi işin düştüğüne bakın.
- Aynı dala art arda iki push atın; ilk çalıştırmanın iptal edildiğini görün.
- `.next/cache` önbelleğini ekleyin ve ikinci çalıştırmada build süresinin değişip değişmediğine bakın.
- Depo ayarlarında `production` adında bir ortam oluşturun, kendinizi onaylayıcı yapın ve bir deploy işinin onay beklediğini görün.

## Detaylı öğrenmek için

- **Yazı:** [Martin Fowler](https://martinfowler.com/), "Continuous Integration"; pratiğin kuralları ve hızlı build.[^1]
- **Yazı:** [Martin Fowler](https://martinfowler.com/), "Deployment Pipeline"; hattı aşamalara bölmek.[^3]
- **Resmi doküman:** GitHub, "Secure use reference"; token izinleri, secret'lar ve eylemleri sabitlemek.[^6]

## Kaynaklar

1. [Martin Fowler](https://martinfowler.com/): [Continuous Integration](https://martinfowler.com/articles/continuousIntegration.html) *(article)* — İlk sürüm 2006. Günlük birleştirme, otomatik build ve hızlı geri bildirim.
2. [Martin Fowler](https://martinfowler.com/): [Continuous Delivery](https://martinfowler.com/bliki/ContinuousDelivery.html) *(article)* — 30 Mayıs 2013. Her an yayınlanabilir yazılım ve sürekli deploy farkı.
3. [Martin Fowler](https://martinfowler.com/): [Deployment Pipeline](https://martinfowler.com/bliki/DeploymentPipeline.html) *(article)* — 30 Mayıs 2013. Build'i hızlıdan yavaşa aşamalara bölmek.
4. [Next.js: CI Build Caching](https://nextjs.org/docs/app/guides/ci-build-caching) *(doc)* — `.next/cache`'i CI'da korumak ve GitHub Actions örneği.
5. [GitHub: Control the concurrency of workflows and jobs](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/control-workflow-concurrency) *(doc)* — `concurrency` grupları ve `cancel-in-progress`.
6. [GitHub: Secure use reference](https://docs.github.com/en/actions/reference/security/secure-use) *(doc)* — En az yetki, `GITHUB_TOKEN` izinleri, eylemleri commit SHA'sına sabitlemek.
7. [GitHub: Secrets](https://docs.github.com/en/actions/concepts/security/secrets) *(doc)* — Secret'ların saklanması, iş akışında kullanılması ve otomatik maskeleme.
8. [GitHub: Compromised runners](https://docs.github.com/en/actions/concepts/security/compromised-runners) *(doc)* — Fork'tan gelen pull request'lerin salt okunur yetkisi ve secret erişimi.
9. [GitHub: Deployment environments](https://docs.github.com/en/actions/concepts/workflows-and-actions/deployment-environments) *(doc)* — Ortamlar, koruma kuralları ve ortam secret'ları.
10. [GitHub: Workflow dependency lockfiles](https://docs.github.com/en/actions/concepts/security/workflow-dependency-lockfiles) *(doc)* — Eylemleri kilit dosyasıyla commit'e sabitlemek *(önizleme)*.
