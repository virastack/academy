---
title: "Terminal ve npm"
description: "Temel komutlar, Node kurulumu ve paket yönetimi."
lastVerified: "2026-10-17"
translationKey: "web-fundamentals/terminal-and-npm"
---

## Terminal Nedir?

**Terminal**, programları yazı yazarak çalıştırdığınız metin tabanlı arayüzdür. Teknik olarak terminal, bir **shell** başlatıp ona bağlanan programdır; komutları yorumlayan shell'dir. Günlük kullanımda iki kelime aynı anlamda kullanılır.[^1]

![macOS Terminal penceresi: zsh shell'i açık, ev klasöründe (~) komut bekleyen boş bir satır](https://raw.githubusercontent.com/virastack/academy/main/assets/web-fundamentals/terminal-and-npm/terminal-macos.png)

Frontend geliştirirken terminali her gün açarsınız: paket kurmak, geliştirme sunucusunu başlatmak, build almak ve Git için.[^2]

| Sistem | Ne kullanılır |
| :-- | :-- |
| macOS | `Uygulamalar/İzlenceler/Terminal` |
| Linux | Uygulamalardaki terminal |
| Windows | **WSL** (Windows Subsystem for Linux); `cmd` Unix komutlarıyla aynı çalışmaz |

MDN, Windows'ta WSL kurmayı açıkça öneriyor.[^1] VS Code'un içindeki terminal de iyi bir başlangıçtır; editörden çıkmadan komut çalıştırırsınız.[^2]

## Temel Komutlar

| Komut | Ne yapar |
| :-- | :-- |
| `pwd` | Şu an hangi klasörde olduğunuzu yazar |
| `ls` | Klasördeki dosyaları listeler (`ls -la` gizli dosyalarla, ayrıntılı) |
| `cd proje` | `proje` klasörüne girer |
| `cd ..` | Bir üst klasöre çıkar |
| `cd ~` | Ev klasörünüze döner |
| `mkdir proje` | Yeni klasör açar |
| `touch index.html` | Boş dosya oluşturur |
| `cp a.txt b.txt` | Kopyalar |
| `mv a.txt b.txt` | Taşır ya da yeniden adlandırır |
| `rm a.txt` | Siler; `rm -r klasor` klasörü içindekilerle siler |

`.` bulunduğunuz klasör, `..` bir üst klasördür.[^2] `-l` gibi tireyle başlayan ekler **flag**'dir ve komutun davranışını değiştirir; `-la` gibi birleştirilebilirler.[^1][^2] Bir komutun nasıl kullanıldığını `man ls` ya da çoğu araçta `--help` ile görürsünüz.[^3]

> [!DO]
>
> - Yolları yazarken `Tab`'a basın; terminal klasör ve dosya adını tamamlar.[^2]
> - Önceki komutları `↑` ile geri getirin.[^1]
> - Çalışan bir komutu (örneğin geliştirme sunucusunu) `Ctrl` + `C` ile durdurun.[^2]

> [!CAUTION]
>
> `rm` ile silinen dosya çöp kutusuna gitmez, geri getirilemez. `rm -r` bir klasörü tamamen siler; çalıştırmadan önce hangi klasörde olduğunuzu `pwd` ile kontrol edin.[^1]

## Node.js Kurulumu

**Node.js**, JavaScript'i tarayıcı dışında çalıştıran bir ortamdır; Chrome'un V8 motorunu kullanır.[^4] React kodunuz tarayıcıda çalışsa da Vite, Next.js, ESLint ve test araçları Node üzerinde çalışır. Node'u kurduğunuzda **npm** ve **npx** de gelir.[^1]

Node'un çift sayılı sürümleri **LTS** (long-term support) olur. Node.js ekibi, gerçek projelerde yalnızca LTS sürümlerin kullanılmasını önerir. Ekim 2026 itibarıyla LTS sürüm Node 24, en yeni sürüm Node 26'dır. Node 27'den itibaren yılda bir sürüm çıkacak ve her sürüm LTS olacak.[^5]

Node'u doğrudan değil, bir **sürüm yöneticisiyle** kurmak iyi bir alışkanlıktır: farklı projeler farklı Node sürümleri isteyebilir. macOS, Linux ve WSL'de en yaygını **nvm**'dir:[^6]

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.7/install.sh | bash
nvm install --lts
node -v
npm -v
```

Proje kökündeki `.nvmrc` dosyasına sürüm yazarsanız (`24` gibi), o klasörde `nvm use` doğru sürüme geçer.[^6] nvm Windows'ta doğrudan çalışmaz; WSL kullanmıyorsanız nodejs.org'dan LTS kurulum dosyasını indirin.[^6][^7]

## npm ve package.json

**npm**, hem paket yöneticisi hem de JavaScript paketlerinin tutulduğu en yaygın **registry**'dir. Paket yöneticisi, projenin kullandığı başkalarının yazdığı kodu (**dependency**) indirir, saklar ve kaldırır.[^8]

Her projenin kökünde bir `package.json` bulunur. Projenin adını, script'lerini ve bağımlılıklarını tutar:[^8][^9]

```json
{
  "name": "virastack",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build"
  },
  "dependencies": {
    "react": "^19.3.0"
  },
  "devDependencies": {
    "vite": "^8.3.0"
  }
}
```

- **`dependencies`**: Kaynak kodunuzun `import` ettiği paketler (React gibi).
- **`devDependencies`**: Yalnızca geliştirirken kullanılan araçlar (Vite, ESLint, Vitest gibi).[^8][^9]
- **`private: true`**: Projenin yanlışlıkla npm'e yayınlanmasını engeller.[^8]

### Sık kullanılan komutlar

Projedeki tüm paketleri kurmak için proje klasöründe `npm install` çalıştırın. Yeni bir paket eklemek için:

```command
npm install react
```

Yalnızca geliştirmede kullanılacak bir araç için `-D` ekleyin; paket `devDependencies`'e yazılır:[^8]

```command
npm install -D vite
```

`scripts` altındaki bir komutu çalıştırmak için:[^10]

```command
npm run dev
```

Script'ler projenin kendi `node_modules` klasöründeki araçları bulur, bu yüzden Vite'ı ayrıca global kurmanız gerekmez.[^8][^10] Bir paketi kurmadan tek seferlik çalıştırmak için `npx` vardır; paket projede yoksa indirmeden önce size sorar.[^11]

### Sürüm aralıkları

Paket sürümleri `MAJOR.MINOR.PATCH` biçimindedir. `package.json`'daki işaret, `npm install` çalıştığında hangi güncellemelerin kabul edileceğini belirler:[^12][^8]

| Yazım | Kabul eder | Örnek: `1.0.4` için |
| :-- | :-- | :-- |
| `~1.0.4` | Yalnızca patch | `1.0.x` |
| `^1.0.4` | Minor ve patch | `1.x.x`, ama `2.0.0` değil |
| `1.0.4` | Yalnızca bu sürüm | |

### Lockfile ve node_modules

`npm install`, paketleri `node_modules` klasörüne indirir ve tam olarak hangi sürümlerin kurulduğunu `package-lock.json`'a yazar. Lockfile değişmediği sürece herkesin bilgisayarında aynı `node_modules` oluşur.[^8]

> [!DO]
>
> - `package.json` ve lockfile'ı Git'e ekleyin.
> - `node_modules`'u `.gitignore`'a yazın; `npm install` onu her zaman yeniden oluşturur.[^8]
> - CI'da `npm ci` kullanın: lockfile'a birebir uyar, uyuşmazlıkta hata verir ve dosyaları değiştirmez.[^13]

## pnpm

**pnpm**, npm ile aynı `package.json`'u ve aynı registry'yi kullanan alternatif bir paket yöneticisidir.[^8] Farkı paketleri saklama biçimidir: her paket sürümünü diskte tek bir yerde tutar ve projelere **hard link** ile bağlar. On projede aynı React sürümü varsa diskte bir kopyası olur. Ayrıca projenin yalnızca `package.json`'da yazan paketleri `import` etmesine izin verir; npm'de ise yazmadığınız bir alt bağımlılığı yanlışlıkla kullanabilirsiniz.[^14][^15]

ViraStack projeleri pnpm kullanır. Node kuruluysa pnpm'i şu komutla kurabilirsiniz:[^16]

```bash
npx get-pnpm
```

| İş | npm | pnpm |
| :-- | :-- | :-- |
| Tüm paketleri kur | `npm install` | `pnpm install` |
| Paket ekle | `npm install react` | `pnpm add react` |
| Geliştirme aracı ekle | `npm install -D vite` | `pnpm add -D vite` |
| Script çalıştır | `npm run dev` | `pnpm dev` |
| Tek seferlik çalıştır | `npx <paket>` | `pnpm dlx <paket>` |
| Lockfile | `package-lock.json` | `pnpm-lock.yaml` |

pnpm'de `pnpm dev`, `pnpm run dev`'in kısaltmasıdır; script adı pnpm'in kendi bir komutuyla çakışmadığı sürece çalışır.[^17][^18]

> [!WARNING]
>
> Bir projede tek paket yöneticisi kullanın. Projede `pnpm-lock.yaml` varsa `npm install` değil `pnpm install` çalıştırın.[^8]

## İlk Projeyi Çalıştırmak

Yeni bir React projesi açmak için Vite'ın kurulum aracını çalıştırın. Proje adını ve framework olarak **React**'i sorar:[^19]

```command
npm create vite@latest
```

Ardından proje klasörüne girip paketleri kurun ve geliştirme sunucusunu başlatın:

```bash
cd virastack
pnpm install
pnpm dev
```

Sayfa `http://localhost:5173` adresinde açılır.[^19] Dosyayı kaydettiğinizde tarayıcı güncellenir. İşiniz bitince terminalde `Ctrl` + `C` ile sunucuyu durdurun.[^2]

## Paketlere Güvenmek

Paket kurmak, başkasının yazdığı kodu bilgisayarınızda çalıştırmak demektir. Bazı paketler kurulurken kendi script'lerini de çalıştırır. Bu yüzden iki paket yöneticisi de varsayılanlarını sıkılaştırdı:

- **npm 12** (Temmuz 2026), bağımlılıkların `preinstall`, `install` ve `postinstall` script'lerini artık izin vermediğiniz sürece çalıştırmıyor. Güvendiğiniz paketleri `npm install-scripts approve <paket>` ile onaylarsınız; onay `package.json`'daki `allowScripts` alanına yazılır.[^20]
- **pnpm**, bağımlılıkların kurulum script'lerini v10'dan beri çalıştırmıyor; izin verilecek paketler `allowBuilds` ile listelenir. Ayrıca bir günden yeni yayınlanmış sürümleri varsayılan olarak kurmuyor (`minimumReleaseAge`).[^21]

> [!TIP]
>
> Kurulumda bir paketin script'inin atlandığını söyleyen bir uyarı görürseniz, paketi tanıyorsanız onaylayın, tanımıyorsanız önce araştırın.

## Detaylı Öğrenmek İçin

- **Terminal, frontend gözüyle:** [Josh W. Comeau](https://www.joshwcomeau.com/)'nun React geliştiricileri için yazdığı terminal rehberi.[^2]
- **Shell'i baştan sona:** MIT'nin Missing Semester dersinin shell bölümü; yolları, `$PATH`'i, pipe'ları ve yönlendirmeyi anlatır, videosuyla birlikte.[^3]
- **Paket yönetimi:** MDN'in npm ile sıfırdan bir proje kurduğu rehberi.[^8]
- **Konuşma:** [Tally Barak](https://tallybarak.com/)'ın `node_modules`'un neden böyle olduğunu ve lockfile'ları anlattığı Node Congress 2022 konuşması (9 dk).[^22]
- **Konuşma:** pnpm'in yazarı [Zoltan Kochan](https://www.kochan.io/)'ın pnpm'in nasıl çalıştığını anlattığı DevOps.js Conf 2022 konuşması (31 dk).[^15]

## Kaynaklar

1. [MDN: Command line crash course](https://developer.mozilla.org/en-US/docs/Learn_web_development/Getting_started/Environment_setup/Command_line) *(doc)* — Terminal ve shell farkı, işletim sistemine göre terminal, Windows için WSL önerisi, temel komutlar, Tab, `rm`'in geri alınamaması, npm ve npx'in Node ile gelmesi.
2. [Josh W. Comeau: The Front-End Developer's Guide to the Terminal](https://www.joshwcomeau.com/javascript/terminal-for-js-devs/) *(article)* — `pwd`, `cd`, `.`, `..`, `~`, flag'ler, Tab, `Ctrl` + `C` ile sunucuyu durdurmak; VS Code terminali ve Windows için WSL.
3. [MIT Missing Semester 2026: Course Overview + Introduction to the Shell](https://missing.csail.mit.edu/2026/course-shell/) *(video)* — Yaklaşık 1 saatlik ders ve notları: yollar, `man` ve `--help`, `$PATH`, pipe ve yönlendirme.
4. [Node.js: Introduction to Node.js](https://nodejs.org/en/learn/getting-started/introduction-to-nodejs) *(doc)* — Node'un V8 motorunu tarayıcı dışında çalıştıran bir JavaScript ortamı olması.
5. [Node.js: Node.js Releases](https://nodejs.org/en/about/previous-releases) *(doc)* — Sürüm tablosu, gerçek projelerde yalnızca LTS önerisi ve Node 27'den itibaren yıllık sürüm düzeni.
6. [nvm](https://github.com/nvm-sh/nvm) *(doc)* — Kurulum komutu, `nvm install --lts`, `.nvmrc` ve Windows desteği.
7. [Node.js: Download](https://nodejs.org/en/download) *(doc)* — Resmi kurulum dosyaları; LTS sürüm önceden seçili.
8. [MDN: Package management basics](https://developer.mozilla.org/en-US/docs/Learn_web_development/Extensions/Client-side_tools/Package_management) *(doc)* — Dependency, `package.json`, `dependencies` ve `devDependencies`, lockfile, `node_modules`'un Git'e girmemesi, script'ler, `^`, pnpm ve tek paket yöneticisi kullanmak.
9. [npm Docs: package.json](https://docs.npmjs.com/cli/v12/configuring-npm/package-json) *(doc)* — Alanların resmi tanımı; geliştirme araçlarının `devDependencies`'e yazılması.
10. [npm Docs: scripts](https://docs.npmjs.com/cli/v12/using-npm/scripts) *(doc)* — `npm run`, `node_modules/.bin`'in script'lerde `PATH`'e eklenmesi, pre ve post script'ler.
11. [npm Docs: npx](https://docs.npmjs.com/cli/v12/commands/npx) *(doc)* — Yerel ya da uzaktaki bir paketten komut çalıştırmak; kurmadan önce sorması.
12. [npm Docs: About semantic versioning](https://docs.npmjs.com/about-semantic-versioning) *(doc)* — Patch, minor ve major; `~` ve `^` örnekleri.
13. [npm Docs: npm ci](https://docs.npmjs.com/cli/v12/commands/npm-ci) *(doc)* — `npm install`'dan farkları: lockfile zorunlu, uyuşmazlıkta hata, dosyaları değiştirmez.
14. [pnpm: Motivation](https://pnpm.io/motivation) *(doc)* — Tek depo ve hard link ile disk tasarrufu, katı `node_modules` yapısı, hız.
15. [Zoltan Kochan: pnpm, a Fast, Disk Space Efficient Package Manager (DevOps.js Conf 2022)](https://gitnation.com/contents/pnpm-a-fast-disk-space-efficient-package-manager-for-javascript) *(video)* — 31 dakika. pnpm'in bağımlılıkları nasıl izole ettiği, hard link'ler ve monorepo desteği.
16. [pnpm: Installation](https://pnpm.io/installation) *(doc)* — Kurulum yolları ve Node uyumluluk tablosu.
17. [pnpm: pnpm add](https://pnpm.io/cli/add) *(doc)* — `pnpm add` ve `-D`, `-g` gibi seçenekler.
18. [pnpm: pnpm run](https://pnpm.io/cli/run) *(doc)* — Script'lerin `pnpm <script>` olarak kısaltılması.
19. [Vite: Getting Started](https://vite.dev/guide/) *(doc)* — `npm create vite@latest`, React şablonları, Node sürüm gereksinimi ve `localhost:5173`.
20. [GitHub Changelog: npm install-time security (8 Temmuz 2026)](https://github.blog/changelog/2026-07-08-npm-install-time-security-and-gat-bypass2fa-deprecation/) *(doc)* — npm 12'de bağımlılık kurulum script'lerinin varsayılan olarak kapalı olması ve `npm approve-scripts`.
21. [pnpm: Mitigating supply chain attacks](https://pnpm.io/supply-chain-security) *(doc)* — Kurulum script'lerinin v10'dan beri kapalı olması, `allowBuilds` ve bir günlük `minimumReleaseAge`.
22. [Tally Barak: The Secret Life of Package Managers (Node Congress 2022)](https://gitnation.com/contents/the-secret-life-of-package-managers) *(video)* — 9 dakika. İç içe `node_modules`, hoisting, lockfile'lar ve pnpm'in tek depo yaklaşımı.
