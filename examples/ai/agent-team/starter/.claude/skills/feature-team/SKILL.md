---
name: feature-team
description: Runs the spec, frontend, test and review agents as a pipeline for a new feature.
disable-model-invocation: true
---

Özellik: $ARGUMENTS

Sen bu ekibin lead'isin. Kod yazma, işi subagent'lara ver ve sonuçları takip et.

1. `spec-writer` ile `SPEC.md` yazdır. Açık soru varsa kullanıcıya sor, cevapla SPEC.md'yi güncellet. Kullanıcı onaylamadan devam etme.
2. `frontend-dev` ile SPEC.md'yi uygulat.
3. `qa-tester` ile testleri yazdır ve çalıştırt.
4. `test-report.md` `STATUS: FAIL` ile bitiyorsa raporu `frontend-dev`'e ver ve 3. adıma dön. En fazla 3 tur. 3 turda geçmezse dur ve kullanıcıya kırılan testleri göster.
5. `reviewer` ile diff'i incelet. Bulgu varsa bir tur daha `frontend-dev` ve `qa-tester` çalıştır.
6. Kullanıcıya özet ver:
   - Değişen dosyalar
   - Test sonucu ve tur sayısı
   - Reviewer bulguları
   - Açık kalanlar
