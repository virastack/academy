---
title: "Git"
description: "Commit, branch ve uzak depo ile sürüm kontrolü."
lastVerified: "2026-10-17"
translationKey: "web-fundamentals/git"
---

## Git nedir

**Version control** (sürüm kontrolü), dosyalardaki değişiklikleri zaman içinde kaydeden bir sistemdir. Bir dosyayı ya da tüm projeyi eski bir hâline döndürebilir, neyin ne zaman ve kim tarafından değiştirildiğini görebilirsiniz.[^1]

**Git**, en yaygın sürüm kontrol sistemidir ve **dağıtıktır**: her geliştiricinin bilgisayarında projenin ve tüm geçmişinin tam bir kopyası bulunur. Bu yüzden commit atmak için internete bağlı olmanız gerekmez.[^2][^1]

**GitHub** ise Git değildir. Git depolarını (**repository**, kısaca repo) barındıran ve üstüne pull request, code review gibi ekip araçları ekleyen bir servistir. GitLab ve Bitbucket aynı işi yapar.[^2]

## Kurulum ve ilk ayar

macOS ve Linux'ta Git çoğu zaman kuruludur; terminalde `git --version` ile kontrol edin. Kurduktan sonra ilk iş adınızı ve e-postanızı tanımlayın. Her commit bu bilgiyi taşır ve sonradan değiştirilemez:[^3]

```bash
git config --global user.name "Ömer Gülçiçek"
git config --global user.email iletisim@omergulcicek.com
git config --global init.defaultBranch main
```

Son satır, yeni açtığınız projelerde ana branch'in adını `main` yapar. GitHub ve diğer servisler `main` kullanır; Git de 3.0 sürümünde varsayılanı `master`'dan `main`'e çekecek.[^3][^4]

## Temel akış

Git'te bir dosya üç durumdan birindedir:[^5]

| Durum | Anlamı |
| :-- | :-- |
| **Modified** | Dosyayı değiştirdiniz ama henüz kaydetmediniz |
| **Staged** | Değişikliği bir sonraki commit'e girmek üzere işaretlediniz |
| **Committed** | Değişiklik Git'in veritabanına güvenle kaydedildi |

Yani akış hep aynıdır: dosyayı değiştirirsiniz, commit'e girecek değişiklikleri `git add` ile **staging area**'ya eklersiniz, sonra `git commit` ile o anın fotoğrafını çekersiniz.[^5][^2]

| Komut | Ne yapar |
| :-- | :-- |
| `git init` | Bulunduğunuz klasörde yeni bir repo başlatır |
| `git clone <url>` | Uzaktaki bir repoyu tüm geçmişiyle bilgisayarınıza indirir |
| `git status` | Hangi dosyaların değiştiğini ve hangilerinin staged olduğunu gösterir |
| `git diff` | Henüz staged olmayan değişiklikleri satır satır gösterir |
| `git add index.html` | Dosyayı staging area'ya ekler (`git add .` hepsini) |
| `git commit -m "Add cart button"` | Staged değişiklikleri geçmişe kaydeder |
| `git log --oneline` | Commit geçmişini kısa listeler |

> [!TIP]
>
> Ne yapacağınızdan emin değilseniz önce `git status` çalıştırın. Çıktısı çoğu zaman bir sonraki komutu da önerir.

### .gitignore

Repoya girmemesi gereken dosyaları kökteki `.gitignore` dosyasına yazarsınız. Frontend projelerinde bunlar genelde `node_modules`, build çıktıları (`dist`, `.next`) ve `.env` gibi gizli bilgi taşıyan dosyalardır.[^6]

```bash
node_modules
dist
.env
```

> [!WARNING]
>
> Zaten commit edilmiş bir dosyayı `.gitignore`'a yazmak onu repodan çıkarmaz. Önce `git rm --cached .env` ile takipten çıkarın. Şifre ya da API anahtarı bir kez push edildiyse, anahtarı da değiştirin.[^6]

## Branch

**Branch**, ana koddan ayrılıp kendi değişikliklerinizi yaptığınız bağımsız bir çalışma hattıdır. `main` bozulmadan yeni bir özelliği deneyebilirsiniz.

```bash
git switch -c add-to-cart-button   # yeni branch aç ve ona geç
git switch main                    # main'e geri dön
git branch                         # yereldeki branch'leri listele
```

`git switch -c`, branch'i oluşturup ona geçer.[^7] Eski kaynaklarda aynı iş için `git checkout -b` görürsünüz; ikisi de çalışır.[^8]

`git checkout` eskiden hem branch değiştirmek hem de dosyalardaki değişiklikleri geri almak için kullanılıyordu. Aynı komutun iki farklı iş yapması kafa karıştırdığı için Git 2.23 (2019) bu işleri ikiye ayırdı: branch geçişi için `git switch`, dosya geri almak için `git restore`.[^9] `git checkout` hâlâ çalışır, ama branch değiştirirken `git switch` daha güvenlidir: yalnızca branch'lerle ilgilenir, yanlışlıkla dosyalarınızdaki değişiklikleri silmez.[^7]

| İş | Yeni komut | Eski karşılığı |
| :-- | :-- | :-- |
| Branch'e geçmek | `git switch main` | `git checkout main` |
| Branch açıp geçmek | `git switch -c add-to-cart-button` | `git checkout -b add-to-cart-button` |
| Dosyadaki değişikliği geri almak | `git restore index.html` | `git checkout -- index.html` |

İşiniz bitince branch'i `main`'e **merge** edersiniz:

```bash
git switch main
git merge add-to-cart-button
```

`main` siz ayrıldığınızdan beri değişmediyse Git yalnızca işaretçiyi ileri alır (**fast-forward**). İki taraf da ilerlediyse iki ucu ve ortak atalarını birleştiren yeni bir **merge commit** oluşturur.[^8]

## Uzak depo

Bilgisayarınızdaki repo **local**, GitHub'daki **remote**'tur. Varsayılan remote'un adı `origin`'dir.[^2]

| Komut | Ne yapar |
| :-- | :-- |
| `git pull` | Remote'taki yeni commit'leri indirip bulunduğunuz branch'e ekler |
| `git push` | Yerel commit'lerinizi remote'a gönderir |
| `git push -u origin add-to-cart-button` | Yeni bir branch'i ilk kez gönderir ve remote'taki karşılığına bağlar |

Commit yerel bir işlemdir; `git push` yapana kadar ekip arkadaşlarınız değişikliğinizi görmez.[^2]

## İş hayatında Git

### Ekipte günlük akış

Çoğu ekip GitHub flow'a benzer bir akışla çalışır:[^10][^11]

1. `main`'i güncelleyin: `git switch main` ve `git pull`.
2. İş için yeni bir branch açın.
3. Küçük commit'ler atın ve branch'i push edin.
4. Bir **pull request** açın; ekip arkadaşlarınız kodu inceler (bkz. [Kod ve Ekip](/academy/glossary/code-and-team)).
5. Yorumları yeni commit'lerle düzeltin. Push ettikçe PR kendiliğinden güncellenir.
6. Onay gelince PR'ı merge edin ve branch'i silin.

Bu düzende `main`'e doğrudan commit atılmaz; her şey PR ile girer. Böylece `main` her zaman çalışan kodu taşır.[^11]

### Branch'e isim vermek

İyi bir branch adı, ekibin listeye bakıp kimin ne üzerinde çalıştığını anlamasını sağlar: kısa ama açıklayıcı.[^10] [!jira] kullanan ekiplerde ad genelde ticket numarasıyla başlar, çünkü Jira branch adındaki numarayı görüp branch'i, commit'leri ve PR'ı ticket'ın altında gösterir:[^12]

```bash
git switch -c feature/PROJ-123-add-to-cart-button
git switch -c bugfix/PROJ-456-price-rounding
```

Yaygın kalıp `tür/TICKET-NUMARASI-kisa-aciklama`'dır. Tür ön ekleri genelde `feature/`, `bugfix/`, `hotfix/` ve `release/` olur.[^13] Branch adlarını İngilizce, küçük harf ve tireyle yazın; Türkçe karakter ve boşluk kullanmayın. Ekibinizin belirlediği bir kural varsa o geçerlidir.

### Bir iş, bir branch

Birbiriyle ilgisi olmayan işler aynı branch'e girmemeli. GitHub'ın önerisi de bu: her ilgisiz değişiklik grubu için ayrı branch.[^10]

- **İnceleme kolaylaşır.** Tek bir işi anlatan PR daha hızlı ve dikkatli okunur.
- **Biri diğerini bekletmez.** İki iş aynı branch'teyse, birinde çıkan sorun diğerinin de yayına çıkmasını engeller.[^10]
- **Conflict azalır.** Küçük ve kısa ömürlü branch'ler daha az değişiklik taşır, `main`'e geri dönmeleri kolaydır.[^14]

İşi yaparken başka bir hata fark ederseniz onu aynı branch'te düzeltmek yerine yeni bir ticket ve branch açın. Tek istisna, işinizi doğrudan engelleyen küçük düzeltmelerdir; onları da PR açıklamasında belirtin.

### Commit mesajı

Commit mesajı, birkaç ay sonra *"bu satır neden böyle?"* diye soran kişiye yazılır. [Chris Beams](https://cbea.ms/)'in yaygın kabul gören kuralları kısaca şunlar:[^15]

- Başlık 50 karakteri geçmesin ve nokta ile bitmesin.
- Başlığı İngilizce ve emir kipiyle yazın: *"Fix add to cart button"*, *"Fixed add to cart button"* değil.
- Gerekirse bir boş satırdan sonra **neyi** ve **neden** değiştirdiğinizi açıklayın.

Jira kullanan ekiplerde ticket numarası commit mesajına da eklenir: `PROJ-123 Fix add to cart button`.[^12]

### Conflict çıkınca

**Merge conflict**, iki branch aynı dosyanın aynı satırlarını farklı şekilde değiştirdiğinde ya da biri bir dosyayı silip diğeri değiştirdiğinde çıkar. Git hangisinin doğru olduğuna karar veremez ve merge'i durdurur.[^16] Ekipte en sık şöyle görürsünüz: siz kendi branch'inizde çalışırken bir arkadaşınızın PR'ı `main`'e girer ve sizin PR'ınız *"conflict"* uyarısı verir.

Çözmek için güncel `main`'i kendi branch'inize alın:

```bash
git switch main
git pull
git switch feature/PROJ-123-add-to-cart-button
git merge main
```

Conflict varsa Git hangi dosyalarda olduğunu söyler; `git status` bunları **Unmerged paths** altında listeler.[^8] Dosyayı açtığınızda iki versiyonu işaretlerle yan yana görürsünüz:[^8][^16]

```html
<<<<<<< HEAD
<button class="btn-primary">Sepete ekle</button>
=======
<button class="btn btn-lg">Sepete Ekle</button>
>>>>>>> main
```

`HEAD` ile `=======` arası sizin branch'inizdeki, `=======` ile `>>>>>>>` arası gelen branch'teki hâlidir. Sonra:[^17]

1. Hangisinin kalacağına karar verin. Çoğu zaman doğru cevap ikisini birleştirmektir.
2. Üç işaret satırını silin.
3. Projeyi çalıştırıp test edin.
4. `git add <dosya>` ile çözüldü olarak işaretleyin.
5. `git commit` ile merge'i tamamlayın ve `git push` edin.

VS Code gibi editörler conflict'li dosyada *"Accept Current"*, *"Accept Incoming"* ve *"Accept Both"* butonları gösterir; aynı işi tıklayarak yaparsınız.

> [!DO]
>
> - Karşı taraftaki kodu siz yazmadıysanız, karar vermeden önce yazan kişiye sorun.
> - İşler karışırsa `git merge --abort` ile merge'ü iptal edip başladığınız hâle dönün.[^16]
> - `main`'i branch'inize sık alın. Sık birleştirmek merge sayısını artırır ama her birini küçültür ve riskini azaltır.[^14]

> [!DONT]
>
> - Conflict'i *"benimki kalsın"* diyerek karşı tarafın değişikliğini okumadan silmeyin.
> - İşaret satırlarını (`<<<<<<<`, `=======`, `>>>>>>>`) dosyada bırakıp commit etmeyin.

Bazı ekipler `git merge main` yerine `git rebase main` kullanır. Sonuç benzerdir ama geçmişi yeniden yazar; ekibinizin hangisini tercih ettiğini sorun.

## Detaylı öğrenmek için

- **Pratik:** Learn Git Branching; branch, merge ve rebase'i tarayıcıda görsel olarak deneyerek öğretir.[^18]
- **Kitap:** Pro Git, Git'in resmi ve ücretsiz kitabı. İlk üç bölüm günlük kullanım için yeterli.[^1]
- **Git'in içi:** [Mary Rose Cook](https://maryrosecook.com/)'un Git'in commit'leri ve branch'leri nasıl bir graf olarak sakladığını anlattığı yazısı ve konuşması.[^19]
- **Konuşma:** Pro Git'in yazarı [Scott Chacon](https://scottchacon.com/)'ın az bilinen Git özelliklerini anlattığı FOSDEM 2024 konuşması (50 dk). Temelleri oturttuktan sonra izleyin.[^20]

## Kaynaklar

1. [Pro Git: About Version Control](https://git-scm.com/book/en/v2/Getting-Started-About-Version-Control) *(doc)* — Sürüm kontrolünün tanımı, yerel, merkezi ve dağıtık sistemler; her kopyanın tam yedek olması.
2. [GitHub Docs: About Git](https://docs.github.com/en/get-started/using-git/about-git) *(doc)* — Git ile GitHub farkı, dağıtık sürüm kontrolü; `clone`, `pull`, `add`, `commit`, `push` akışı.
3. [Pro Git: First-Time Git Setup](https://git-scm.com/book/en/v2/Getting-Started-First-Time-Git-Setup) *(doc)* — `user.name`, `user.email` ve `init.defaultBranch` ayarları.
4. [Git: Breaking Changes](https://git-scm.com/docs/BreakingChanges) *(doc)* — Git 3.0'da yeni repolarda varsayılan branch adının `main` olacağı; sürümün henüz tarihi yok.
5. [Pro Git: What is Git?](https://git-scm.com/book/en/v2/Getting-Started-What-is-Git%3F) *(doc)* — Modified, staged ve committed durumları; working tree, staging area ve Git klasörü.
6. [GitHub Docs: Ignoring files](https://docs.github.com/en/get-started/git-basics/ignoring-files) *(doc)* — `.gitignore`, takip edilen dosyanın `git rm --cached` ile çıkarılması ve hazır şablonlar.
7. [Git: git-switch](https://git-scm.com/docs/git-switch) *(doc)* — `git switch` ve `-c` ile branch oluşturup geçmek.
8. [Pro Git: Basic Branching and Merging](https://git-scm.com/book/en/v2/Git-Branching-Basic-Branching-and-Merging) *(doc)* — Branch açmak, fast-forward ve merge commit, conflict işaretleri, `Unmerged paths` ve `git add` ile çözmek.
9. [GitHub Blog: Highlights from Git 2.23](https://github.blog/open-source/git/highlights-from-git-2-23/) *(article)* — `git checkout`'un işlerinin deneysel `git switch` ve `git restore` komutlarına bölünmesi (Ağustos 2019).
10. [GitHub Docs: GitHub flow](https://docs.github.com/en/get-started/using-github/github-flow) *(doc)* — Branch, commit, PR, review, merge ve branch'i silme adımları; kısa açıklayıcı branch adları ve ilgisiz işler için ayrı branch.
11. [Atlassian: Feature Branch Workflow](https://www.atlassian.com/git/tutorials/comparing-workflows/feature-branch-workflow) *(article)* — Her özelliğin kendi branch'inde geliştirilmesi ve `main`'in bozuk kod taşımaması.
12. [Atlassian: Reference work items in your development work](https://support.atlassian.com/jira-software-cloud/docs/reference-issues-in-your-development-work/) *(doc)* — Jira anahtarını branch adına, commit mesajına ve PR başlığına yazarak Jira'ya bağlamak.
13. [Bitbucket: Configure a project's branching model](https://support.atlassian.com/bitbucket-cloud/docs/configure-a-projects-branching-model/) *(doc)* — `feature/`, `bugfix/`, `hotfix/` ve `release/` ön ekleri.
14. [Martin Fowler](https://martinfowler.com/): [Patterns for Managing Source Code Branches](https://martinfowler.com/articles/branching-patterns.html) *(article)* — Feature branch, entegrasyon sıklığı; küçük ve sık entegrasyonun conflict'leri azaltması.
15. [Chris Beams](https://cbea.ms/): [How to Write a Git Commit Message](https://cbea.ms/git-commit/) *(article)* — İyi commit mesajının yedi kuralı ve emir kipi testi.
16. [Atlassian: Git merge conflicts](https://www.atlassian.com/git/tutorials/using-branches/merge-conflicts) *(article)* — Conflict'in ne zaman çıktığı, işaretler, `git status`, `git merge --abort`.
17. [GitHub Docs: Resolving a merge conflict using the command line](https://docs.github.com/en/pull-requests/how-tos/merge-and-close-pull-requests/resolving-a-merge-conflict-using-the-command-line) *(doc)* — Conflict'i terminalde adım adım çözmek: düzenle, `git add`, `git commit`.
18. [Learn Git Branching](https://learngitbranching.js.org/) *(doc)* — Tarayıcıda çalışan, görsel ve interaktif Git alıştırmaları.
19. [Mary Rose Cook](https://maryrosecook.com/): [Git from the inside out](https://maryrosecook.com/blog/post/git-from-the-inside-out) *(article)* — Git'in commit, branch ve HEAD'i bir graf olarak nasıl tuttuğu; [konuşma videosu](https://www.youtube.com/watch?v=fCtZWGhQBvo) da var.
20. [Scott Chacon](https://scottchacon.com/): [So You Think You Know Git (FOSDEM 2024)](https://fosdem.org/2024/schedule/event/fosdem-2024-3611-so-you-think-you-know-git/) *(video)* — 50 dakika. Az bilinen Git ayarları ve komutları; deneyimli kullanıcılar için.
