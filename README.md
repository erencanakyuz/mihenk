# MİHENK

**Kriz Anlarında Doğrulanmış Bilgi Akışı ve Adaptif Arayüz Katmanı**

Sosyal medya platformunun kriz anlarında bağlama göre yeniden yapılandığı,
doğrulanmış bilgiyi akışın merkezine alan bir katman. Birincil uygulama alanı
afet; aynı altyapı salgın, orman yangını ve büyük ölçekli kazalarda da çalışır.

> *Mihenk taşı: altının saflığını sınamak için kullanılan referans taş.*

---

## Problem

Kriz anında sosyal medya hem en hızlı bilgi kanalı hem de en hızlı yanlış bilgi
kanalıdır. Düzeltme mekanizmaları, zararın çoktan oluştuğu bir zamanda devreye
girer:

| Gösterge | Süre |
|---|---|
| Bir gönderinin viral yarı ömrü | **5,75 - 6,25 saat** |
| Topluluk temelli düzeltmenin ortalama gecikmesi | **61,4 saat** |

Yaklaşık **10 kat gecikme**. Arama kurtarmanın altın saatleri bu aralıkta biter.

## Mevcut çözümlerin ortak kör noktası

Bugünkü yaklaşımlar üç gruba ayrılıyor:

- **Kriz bandı gösterenler:** platform bir banner açar, ancak ana akış ve
  sıralama algoritması değişmez
- **Etiket ekleyenler:** içerik zaten yayılmışken üzerine not iliştirilir
- **Ayrı uygulama olanlar:** kriz anında kimse yeni uygulama indirmez

Hiçbiri, krizin olduğu yerde, gerçek zamanlı olarak **platformun kendi bilgi
akışını** doğrulanmış kaynaklara öncelik verecek şekilde yeniden düzenlemez.

## Yaklaşım

MİHENK bir uygulama değil, mevcut platformun içinde çalışan bir **katman**dır.
Üç bileşenden oluşur:

**1. Tetikleme.** AFAD açık veri servisinden gelen olay bildirimi ve akış
içindeki anomali sinyalleri ile kriz modu devreye girer.

**2. Doğrulama.** Paylaşımlar kaynak güvenilirliği, içerik tutarlılığı ve köken
bilgisi üzerinden skorlanır. Kurumsal kaynaklar doğrulanabilir kimlik bilgisi
(W3C Verifiable Credentials) ile işaretlenir.

**3. Adaptif arayüz.** Kriz modunda arayüz sadeleşir: doğrulanmış bilgi ve
yardım çağrıları öne çıkar, düşük bant genişliğine uyarlanır, erişilebilirlik
kısıtları sıkılaştırılır.

## Teknoloji

| Katman | Bileşen |
|---|---|
| Türkçe metin işleme | Zemberek-NLP (Apache 2.0) |
| Dil modeli | Trendyol-LLM (Apache 2.0, GGUF ile düşük kaynakta çalışır) |
| Kriz verisi | AFAD `deprem.afad.gov.tr/apiv2` açık servisi |
| Köken doğrulama | C2PA, W3C Verifiable Credentials v2.0 |
| Erişilebilirlik | WCAG 2.2 |

## Depo yapısı

```
mihenk/
├── docs/
│   ├── mimari.md               Sistem mimarisi
│   ├── kullanici-akislari.md   Kullanıcı akışları
│   ├── dogrulama-modeli.md     Güvenilirlik skorlama
│   └── erisilebilirlik.md      WCAG yaklaşımı
└── design/                     Arayüz tasarımları
```

## Durum

Geliştirme aşamasında. Mimari ve arayüz tasarımı `docs/` ve `design/` altında
belgelenmektedir.

## Bağlam

TEKNOFEST 2026 NSosyal İnovasyon Yarışması, Kullanıcı Katılımı ve Arayüz
(UI/UX) teması.
