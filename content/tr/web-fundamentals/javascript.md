---
title: "JavaScript"
description: "Dilin temelleri, DOM ve asenkron akış."
lastVerified: "2026-10-17"
translationKey: "web-fundamentals/javascript"
---

## JavaScript nedir

[!javascript], web sayfalarını etkileşimli yapan programlama dilidir. [!html] içeriği, [!css] görünümü tanımlar; bir sayfa sabit bilgi göstermekten fazlasını yapıyorsa *(menü açılıyor, form kontrol ediliyor, veri sunucudan geliyorsa)* arkasında JavaScript vardır.[^1] Aynı dil tarayıcının dışında [!nodejs] ile de çalışır; [!react] projelerindeki geliştirme sunucusu, build araçları ve paketler de JavaScript'tir.

Bu ders dilin tamamını anlatmaz. React'e geçmeden önce bilinmesi gereken temellere kısaca değinir, her konuda derinleşmek için kaynak gösterir.

JavaScript sayfaya `<script>` etiketiyle eklenir. Modern yöntem `type="module"` kullanmaktır; modül script'ler HTML işlenene kadar bekler, bu yüzden `<head>` içine koymak güvenlidir.[^1]

```html
<script type="module" src="main.js"></script>
```

Kodu denemenin en kısa yolu tarayıcının DevTools konsoludur: herhangi bir sayfada konsolu açıp `console.log("merhaba")` yazmak yeterlidir.

## Değişkenler ve tipler

Değişken tanımlamanın üç yolu vardır. `var` eski ve hataya açık davranışları yüzünden artık kullanılmaz.[^2]

```js
const site = "ViraStack"; // yeniden atanamaz
let count = 0; // yeniden atanabilir
count = count + 1;
```

MDN'in kuralı kısadır: "Mümkünse `const`, gerekirse `let`."[^2] `const` değişkenin yeniden atanmasını engeller, içindeki object'in değişmesini engellemez.

JavaScript **dinamik tipli** bir dildir: değişkenin tipi tanımlanmaz, aynı değişkene farklı tipte değerler atanabilir. Temel *(primitive)* tipler `string`, `number`, `boolean`, `null`, `undefined`, `bigint` ve `symbol`'dür; geri kalan her şey *(array ve fonksiyon dahil)* **object**'tir.[^3]

Dil gerektiğinde tipleri kendiliğinden dönüştürür. Bu yüzden karşılaştırmada `===` kullanılır; `==` önce tip dönüştürür ve sonucu tahmin etmek zordur.[^4]

```js
0 == "0"; // true
0 === "0"; // false
```

> [!NOTE]
>
> Tip hatalarını kod çalışmadan yakalamak için JavaScript projelerinin çoğu artık TypeScript kullanıyor. State of JS 2025'te katılımcıların %40'ı yalnızca TypeScript yazdığını söyledi.[^5] TypeScript'i bu yol haritasının sonraki bölümünde ayrıca ele alıyoruz.

## Fonksiyonlar

Fonksiyon, tekrar kullanılabilen bir kod bloğudur. İki yaygın yazımı vardır: klasik **function declaration** ve daha kısa **arrow function**.[^6]

```js
function add(a, b) {
  return a + b;
}

const multiply = (a, b = 1) => a * b; // b verilmezse 1 olur
```

React component'leri ve olay işleyicileri çoğunlukla arrow function ile yazılır.

### Closure

Bir fonksiyon, tanımlandığı yerdeki değişkenleri o kapsam bittikten sonra da **hatırlar**. Buna **closure** denir.[^6][^7]

```js
function createCounter() {
  let count = 0;
  return () => ++count;
}

const increment = createCounter();
increment(); // 1
increment(); // 2
```

Closure, React'te hook'ların ve olay işleyicilerinin nasıl çalıştığını anlamanın temelidir; bir component'in içindeki fonksiyon, o render'daki state'i "hatırlar".

## Object ve array

**Object** anahtar ve değer çiftlerinden, **array** sıralı değerlerden oluşur. Sunucudan gelen veri neredeyse her zaman bu ikisinin birleşimidir.

```js
const user = { name: "Ayşe", age: 28 };
const products = [
  { name: "Kalem", price: 20 },
  { name: "Defter", price: 45 },
];
```

### Destructuring ve spread

**Destructuring**, object ya da array'den değerleri tek satırda değişkene çıkarır. **Spread** *(`...`)* ise bir object ya da array'i başka birinin içine açar.[^8][^9]

```js
const { name, age } = user;
const updatedUser = { ...user, age: 29 }; // yeni object, orijinal değişmez
const allProducts = [...products, { name: "Silgi", price: 10 }];
```

Spread **sığ kopya** üretir: iç içe object'ler kopyalanmaz, aynı referans paylaşılır.[^9] React'te state'i değiştirmek yerine bu şekilde yeni bir kopya oluşturursunuz.

### Array metotları

En sık kullanılan metotlar şunlardır:[^10]

| Metot | Ne yapar |
| :-- | :-- |
| `map` | Her elemanı dönüştürüp **yeni** bir dizi döndürür |
| `filter` | Koşulu sağlayanlardan **yeni** bir dizi döndürür |
| `find` | Koşulu sağlayan ilk elemanı döndürür |
| `reduce` | Diziyi tek bir değere indirger *(toplam gibi)* |

```js
const names = products.map((p) => p.name); // ["Kalem", "Defter"]
const cheapProducts = products.filter((p) => p.price < 30);
const total = products.reduce((sum, p) => sum + p.price, 0); // 65
```

> [!WARNING]
>
> `sort`, `reverse` ve `splice` orijinal diziyi değiştirir.[^10] React state'i üzerinde kullanmadan önce kopyalayın: `[...items].sort()`.

Eksik olabilecek değerler için iki kısa operatör vardır: `user.address?.city`, `address` yoksa hata vermek yerine `undefined` döner, `value ?? "default"` ise değer `null` ya da `undefined` ise sağdakini kullanır.[^11]

## DOM ve olaylar

Tarayıcı HTML'i okuyup bir ağaç yapısına çevirir; buna **DOM** *(Document Object Model)* denir. JavaScript bu ağaca erişip içeriği okuyabilir ve değiştirebilir.[^12]

```js
const heading = document.querySelector("h1");
heading.textContent = "New title";
heading.classList.add("active");
```

**Olaylar** *(event)*, sistemde olan ve kodunuzun tepki verebileceği şeylerdir: tıklama, tuşa basma, formun gönderilmesi. Tepki vermek için `addEventListener` kullanılır.[^13]

```js
const form = document.querySelector("form");

form.addEventListener("submit", (e) => {
  e.preventDefault(); // sayfanın yeniden yüklenmesini engeller
  console.log("Form submitted");
});
```

> [!TIP]
>
> React'te DOM'u bu şekilde elle değiştirmezsiniz; state'i güncellersiniz, React DOM'u sizin yerinize günceller. Yine de altta olanı bilmek, React'in neyi neden yaptığını anlamayı kolaylaştırır.

## Asenkron akış

Sunucudan veri çekmek gibi işlemler zaman alır. JavaScript bu süre boyunca beklemek yerine işini sürdürür ve sonuç gelince devam eder. Bu bekleme **Promise** ile temsil edilir: ileride tamamlanacak ya da başarısız olacak bir işlemin sonucunu taşıyan bir object.[^14]

Promise ile çalışmanın okunaklı yolu `async`/`await`'tir. `await`, kodu senkron kod gibi yukarıdan aşağıya okunur hale getirir; hatalar `try`/`catch` ile yakalanır.[^15]

```js
async function fetchProducts() {
  try {
    const response = await fetch("/api/products");
    if (!response.ok) {
      throw new Error(`Hata: ${response.status}`);
    }
    const products = await response.json();
    console.log(products);
  } catch (error) {
    console.error(error);
  }
}
```

> [!CAUTION]
>
> `fetch` sunucu 404 ya da 500 döndürdüğünde hata fırlatmaz; yalnızca ağ hatasında başarısız olur. Bu yüzden `response.ok` her zaman kontrol edilmelidir.[^16]

### Event loop

JavaScript tek bir iş parçacığında *(thread)* çalışır ve her işi bitirmeden bir sonrakine geçmez.[^17] Bekleyen işler *(zamanlayıcılar, tamamlanan Promise'ler, tıklamalar)* bir kuyrukta sıralanır ve **event loop** onları sırayla çalıştırır. Bu mekanizmayı görsel olarak anlamanın en kısa yolu Lydia Hallie'nin 12 dakikalık videosudur.[^18]

## Modüller

Projeler büyüdükçe kod dosyalara bölünür. Her dosya bir **modül**dür; dışarıya açmak istediğini `export` ile verir, başka bir dosyadan ihtiyacını `import` ile alır.[^19]

```js
// price.js
export const TAX_RATE = 0.2;
export default function addTax(amount) {
  return amount * (1 + TAX_RATE);
}

// main.js
import addTax, { TAX_RATE } from "./price.js";
```

Süslü parantezli olanlar **named export**'tur ve istenildiği kadar olabilir. Parantezsiz olan **default export**'tur ve modül başına bir tanedir.[^19] React projelerinde her component bir modüldür ve bu iki yazımı sürekli görürsünüz.

## Detaylı öğrenmek için

- **Baştan sona rehber:** javascript.info; dil ve tarayıcı *(DOM, olaylar)* bölümleri, güncel tutuluyor.[^20]
- **Alıştırmalı kurs:** MDN'in Dynamic scripting with JavaScript modülü.[^21]
- **Ücretsiz kitap:** [Marijn Haverbeke](https://marijnhaverbeke.nl/)'nin Eloquent JavaScript kitabının 4. baskısı.[^22]
- **React öncesi kontrol listesi:** [Kent C. Dodds](https://kentcdodds.com/)'un "JavaScript to Know for React" yazısı.[^11]
- **Konuşma:** [Philip Roberts](http://latentflip.com/)'ın event loop konuşması *(JSConf EU 2014, 27 dk)*.[^23]
- **Konuşma:** [Jake Archibald](https://jakearchibald.com/)'ın tarayıcı event loop'u konuşması *(JSConf.Asia 2018, 35 dk)*.[^24]

## Kaynaklar

1. [MDN: What is JavaScript?](https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Scripting/What_is_JavaScript) *(doc)* — Dilin tanımı ve script'i sayfaya ekleme (`defer`, `async`, `type="module"`).
2. [MDN: Storing the information you need — Variables](https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Scripting/Variables) *(doc)* — `var`, `let` ve `const` farkı; "Use `const` when you can, and use `let` when you have to."
3. [MDN: JavaScript data types and data structures](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Data_structures) *(doc)* — Primitive tipler, dinamik ve zayıf tip sistemi.
4. [MDN: Equality comparisons and sameness](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Equality_comparisons_and_sameness) *(doc)* — Neredeyse her zaman `===` kullanmak ve `==`'den kaçınmak.
5. [InfoQ: State of JavaScript 2025](https://www.infoq.com/news/2026/03/state-of-js-survey-2025) *(research)* — Yalnızca TypeScript yazanların oranı ve en büyük dil sıkıntısı olarak statik tip eksikliği.
6. [MDN: Functions](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Functions) *(doc)* — Declaration, expression, arrow function, varsayılan parametre ve closure.
7. [javascript.info: Variable scope, closure](https://javascript.info/closure) *(article)* — Closure'ın diyagramlarla adım adım anlatımı.
8. [MDN: Destructuring](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Destructuring) *(doc)* — Object ve array destructuring, varsayılan değer ve rest.
9. [MDN: Spread syntax (...)](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Spread_syntax) *(doc)* — Array ve object'te spread; sığ kopya.
10. [javascript.info: Array methods](https://javascript.info/array-methods) *(article)* — `map`, `filter`, `find`, `reduce`; orijinali değiştiren ve yeni dizi döndüren metotlar.
11. [Kent C. Dodds](https://kentcdodds.com/): [JavaScript to Know for React](https://kentcdodds.com/blog/javascript-to-know-for-react) *(article)* — React için gereken JS özellikleri: destructuring, spread, array metotları, `?.`, `??` ve async/await.
12. [MDN: DOM scripting introduction](https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Scripting/DOM_scripting) *(doc)* — DOM ağacı, `querySelector`, `textContent`, `classList`.
13. [MDN: Introduction to events](https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Scripting/Events) *(doc)* — `addEventListener`, event nesnesi ve `preventDefault`.
14. [MDN: Using promises](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Using_promises) *(doc)* — Promise tanımı, zincirleme ve `Promise.all`.
15. [MDN: How to use promises](https://developer.mozilla.org/en-US/docs/Learn_web_development/Extensions/Async_JS/Promises) *(doc)* — Aynı `fetch` örneği önce Promise zinciri, sonra `async`/`await` ile.
16. [MDN: Using the Fetch API](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch) *(doc)* — `fetch`'in HTTP hatalarında reject etmemesi ve `response.ok` kontrolü.
17. [MDN: JavaScript execution model](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Execution_model) *(doc)* — Job queue, event loop ve run-to-completion.
18. [Lydia Hallie: JavaScript Visualized - Event Loop, Web APIs, (Micro)task Queue](https://www.youtube.com/watch?v=eiC58R16hb8) *(video)* — Yaklaşık 12 dakika. Call stack, task ve microtask kuyruğu animasyonlarla.
19. [MDN: JavaScript modules](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules) *(doc)* — `export`/`import`, named ve default export, `type="module"`.
20. [javascript.info: The Modern JavaScript Tutorial](https://javascript.info/) *(doc)* — Dil ve tarayıcı bölümleriyle baştan sona JavaScript rehberi.
21. [MDN: Dynamic scripting with JavaScript](https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Scripting) *(doc)* — Değişkenlerden DOM, `fetch` ve JSON'a alıştırmalı modül.
22. [Marijn Haverbeke](https://marijnhaverbeke.nl/): [Eloquent JavaScript, 4. baskı](https://eloquentjavascript.net/) *(article)* — 2024 tarihli, ücretsiz okunabilen kitap; dil, tarayıcı ve Node bölümleri.
23. [Philip Roberts](http://latentflip.com/): [What the heck is the event loop anyway? (JSConf EU 2014)](https://www.youtube.com/watch?v=8aGhZQkoFbQ) *(video)* — 27 dakika. Call stack ve callback kuyruğunun görsel anlatımı.
24. [Jake Archibald](https://jakearchibald.com/): [In The Loop (JSConf.Asia 2018)](https://www.youtube.com/watch?v=cCOL7MC4Pl0) *(video)* — 35 dakika. Task, microtask, `requestAnimationFrame` ve render sırası.
