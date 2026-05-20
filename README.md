# MotorLab — Autoserviso svetainė

Pilna autoserviso svetainė su klientų registracija ir admin valdymu.

## Failai

- `index.html` — klientų puslapis (hero, paslaugos, atsiliepimai, registracija)
- `admin.html` — administracijos panelė (savaitės kalendorius, sąrašas, nustatymai)
- `data.js` — bendras duomenų ir kapaciteto valdymo modulis
- `booking.js` — klientų registracijos formos logika
- `admin.js` — admin panelės logika

## Kaip paleisti

Atidarykite `index.html` naršyklėje. Jokio serverio nereikia — viskas veikia kliente.

## Stack

- HTML + CSS + JavaScript (pure, be framework'ų)
- Tailwind CSS (per CDN)
- Google Fonts (Bebas Neue + Space Grotesk + JetBrains Mono)
- localStorage (kliento naršyklėje, kaip mini-duomenų bazė)

## Kapaciteto logika

Sistema skaičiuoja **minutes**, ne mašinų skaičių:

- 2 mechanikai × 480 min = 960 min/diena
- Kiekviena paslauga + 15 min buferis
- Maks. 1 didelis darbas (>120 min) per dieną
- Lygiagrečios paslaugos — du mechanikai gali dirbti tuo pačiu metu
- Pietūs 12:00–13:00 automatiškai blokuojami

Kai diena pilnai užimta, kalendoriuje rodoma "užimta" — klientas tos dienos nepasirinks.

## Registracijos srautas (klientų pusė)

1. **Paslauga** — klientas pasirenka iš katalogo
2. **Data** — kalendoriuje matomos laisvos dienos (žalias), beveik užimtos (geltonas), užimtos (pilkas)
3. **Laikas** — pasirenka iš dinamiškai suskaičiuotų laisvų laikų
4. **Kontaktai** — vardas, telefonas, automobilis
5. **Patvirtinimas** — gauna ID numerį

## Admin panelės funkcijos

- **Kalendorius** — savaitės rodinys su visomis rezervacijomis ir kapaciteto juostomis
- **Naujas įrašas** — rankinis rezervacijos sukūrimas po telefono skambučio
- **Sąrašas** — visos rezervacijos su paieška ir filtru
- **Nustatymai** — keičiamas darbo dienos ilgis, mechanikų skaičius, buferiai

Skirtingi šaltiniai pažymėti spalvomis:
- Mėlyna — online registracija
- Žalia — telefonu
- Geltona — atvyko tiesiogiai

## Produkcijai

Šis prototipas naudoja localStorage. Realiai svetainei reikia:
- Backend (Node.js / PHP / Python) su tikrai duomenų baze (PostgreSQL, MySQL)
- API endpoint'ai vietoj funkcijų: `POST /api/bookings`, `GET /api/availability`
- SMS integravimas (Twilio, Vonage) priminimui
- Email patvirtinimai (SendGrid, Mailgun)
- Autentikacija admin pusei
