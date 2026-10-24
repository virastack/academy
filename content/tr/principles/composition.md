---
title: "Composition over Inheritance"
description: "React'te neden kalıtım değil composition kullanılır."
lastVerified: "2026-10-24"
translationKey: "principles/composition"
---

Başka bir dilde nesne yönelimli programlama yaptıysanız, ortak davranışı kalıtımla paylaşmaya alışkın olabilirsiniz. Bu rehber [!react] için tek bir soruyu cevaplıyor: ortak kodu nasıl paylaşırsınız? Cevap: kalıtımla değil, composition ile.

## Kalıtım değil composition

**Kalıtım**, bir sınıfın başka bir sınıftan türeyip onun davranışını devralmasıdır. **Composition** ise bir component'in başka component'leri kullanarak kendini kurmasıdır.

React ekibinin resmi tutumu net: kod paylaşmak için composition önerilir. Dokümana göre Facebook'ta binlerce component'te React kullanıldı ve component kalıtım hiyerarşisi gerektiren bir durum bulunmadı. Props ve composition, bir component'in görünüşünü ve davranışını açık ve güvenli biçimde özelleştirmek için yeterli esnekliği veriyor.[^1]

```tsx
// ❌ Kalıtımla özelleştirme
class DangerButton extends Button {}

// ✅ Composition: Button'ı kullanan yeni bir component
function DangerButton(props: ButtonProps) {
  return <Button {...props} variant="danger" />
}
```

## İki kalıp: containment ve specialization

Dokümanda composition iki kalıpla anlatılıyor.[^1]

| Kalıp | Ne zaman? | Nasıl? |
| --- | --- | --- |
| **Containment** (içerme) | Component içine ne konacağını bilmiyorsa (`Dialog`, `Sidebar`) | `children` prop'u veya adlı prop (`left`, `right`) |
| **Specialization** (özelleştirme) | Genel bir component'in özel hâli gerekiyorsa | Özel component, genel olanı render edip prop ile ayarlar |

```tsx
function Dialog({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section role="dialog" aria-label={title}>
      {children}
    </section>
  )
}

// Specialization: Dialog'un özel hâli
function ConfirmDeleteDialog() {
  return (
    <Dialog title="Silinsin mi?">
      <p>Bu işlem geri alınamaz.</p>
    </Dialog>
  )
}
```

`children` ve adlı slot'ların ayrıntısı [Props ve Composition](/academy/react/props-and-composition) rehberinde. Büyük ölçekli kalıp olan compound component ise [Component ve Kod Organizasyonu](/academy/architecture/component-organization) rehberinde. İkisini burada tekrar etmiyoruz.

## Mantığı paylaşmak: mixin, HOC, hook

Composition yalnızca görünüş için değil, **mantık** paylaşmak için de gerekli. React'te bu iş zaman içinde üç yöntemle yapıldı.

**Mixin.** Ortak davranışı component'e dışarıdan karıştıran bir yapıydı. React ekibi mixin'leri sorunlu buldu: component ile mixin birbirinin metotlarına örtük olarak bağlanıyor, iki mixin aynı metot adını kullanınca birlikte çalışamıyor ve zamanla karmaşıklık büyüyor.[^2]

**Higher-order component (HOC).** Bir component alıp yeni bir component döndüren fonksiyon. Orijinali değiştirmek yerine bir kapsayıcıyla sarmalıyor.[^3] Dokümana göre HOC'ler render içinde uygulanmamalı, çünkü her render'da yeni bir component türü oluşup alt ağacın state'i kaybediliyor.[^3] Aynı sayfa HOC'lerin modern React kodunda yaygın kullanılmadığını da belirtiyor.[^3]

**Custom hook.** HOC ve render props ile mantık paylaşırken component ağacını yeniden düzenlemek gerekiyor ve bu DevTools'ta iç içe sarmalayıcılara ("wrapper hell") yol açıyor. Hook'lar mantığı hiyerarşiyi değiştirmeden paylaşmaya izin veriyor.[^4]

```tsx
import { useSyncExternalStore } from 'react'

function subscribe(callback: () => void) {
  window.addEventListener('online', callback)
  window.addEventListener('offline', callback)
  return () => {
    window.removeEventListener('online', callback)
    window.removeEventListener('offline', callback)
  }
}

export function useOnlineStatus() {
  return useSyncExternalStore(
    subscribe,
    () => navigator.onLine, // istemcideki değer
    () => true, // sunucudaki değer
  )
}
```

`StatusBar` ve `SaveButton` gibi iki component aynı `useOnlineStatus()` çağrısını yapar ve tarayıcı olayını izleme ayrıntısını bilmez.[^5] Hook **mantığı** paylaşır, state'i değil: her çağıran kendi state'ini alır.[^5] İsmin `use` ile başlaması da bir kural: çağıran yerden state ya da Effect saklı olabileceğini görürsünüz.[^5]

## Ne zaman gerekmez?

> [!CAUTION]
>
> Composition her şeyi parçalamak demek değil.
>
> - **Her tekrarı hook'a çıkarmayın.** Dokümana göre biraz tekrar sorun değil. Tek bir `useState`'i sarmalamak çoğu zaman gereksiz.[^5]
> - **`useMount` gibi genel "yaşam döngüsü" hook'ları yazmayın.** Doküman bunları önermiyor: linter doğrudan `useEffect` çağrılarını denetliyor, sarmalanmış hâli denetlemiyor ve eksik bağımlılık hatası gözden kaçıyor.[^5]
> - **Hook gerekmeyebilir.** Dokümandaki örnekte bir fade-in animasyonu, hook yerine düz CSS animasyonuyla daha basit ve verimli çözülüyor.[^5]
> - **Eski kodda HOC görürseniz** hemen yeniden yazmayın. Çalışıyorsa bırakın, yeni kodda hook tercih edin.

## Kaynaklar

1. [React: Composition vs Inheritance](https://legacy.reactjs.org/docs/composition-vs-inheritance.html) *(doc)* — Containment (`children`, adlı prop), specialization ve kalıtımı gerektiren bir durumun bulunmadığı tespiti. legacy.reactjs.org altındaki eski sürüm dokümanı.
2. [Dan Abramov: Mixins Considered Harmful](https://legacy.reactjs.org/blog/2016/07/13/mixins-considered-harmful.html) *(article)* — React ekibinin blogunda. Mixin'lerde örtük bağımlılık, isim çakışması ve büyüyen karmaşıklık. 13 Temmuz 2016.
3. [React: Higher-Order Components](https://legacy.reactjs.org/docs/higher-order-components.html) *(doc)* — HOC tanımı, orijinali değiştirmeme, render içinde uygulama uyarısı. Sayfa, HOC'lerin modern React kodunda yaygın olmadığını belirtiyor ve react.dev'e yönlendiriyor.
4. [React: Introducing Hooks](https://legacy.reactjs.org/docs/hooks-intro.html) *(doc)* — Hook'ların motivasyonu: render props ve HOC kaynaklı "wrapper hell", mantığı hiyerarşiyi değiştirmeden paylaşma. legacy.reactjs.org altındaki eski sürüm dokümanı.
5. [React: Reusing Logic with Custom Hooks](https://react.dev/learn/reusing-logic-with-custom-hooks) *(doc)* — Hook'ların mantığı paylaşıp state'i paylaşmaması, `use` öneki, her tekrarı çıkarmama ve `useMount` uyarısı.
