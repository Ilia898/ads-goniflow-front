# ბექენდ დეველოპერის დავალებები (BACKEND_TODO)

ეს დოკუმენტი აღწერს ბექენდის მხარეს (`ads-goniflow-back`) განსახორციელებელ ცვლილებებს, რათა სრულყოფილად ამუშავდეს ფრონტენდში დანერგილი ახალი პრემიუმ ფუნქციები.

---

## 1. AI Prompt Enhancer მარშრუტი
მომხმარებლებს ფრონტენდიდან შეუძლიათ მოკლე ინსტრუქციების გაუმჯობესება AI-ის მეშვეობით. ამჟამად ფრონტი იყენებს ლოკალურ Fallback ლოგიკას, რადგან ბექზე შესაბამისი ენდფოინთი არ არსებობს.

### შესაქმნელი ენდფოინთი:
`POST /api/v1/ai/enhance-prompt`

### მოთხოვნის ფორმატი (Request Body):
```json
{
  "prompt": "ყავის ფასდაკლება 20%",
  "platform": "facebook",
  "tone": "friendly"
}
```

### მოსალოდნელი პასუხი (Response 200):
```json
{
  "success": true,
  "data": {
    "enhancedPrompt": "დაწერე პოსტი Facebook-ისთვის ყავის 20%-იან ფასდაკლებაზე. სტილი უნდა იყოს მეგობრული, თბილი და ემოციური. გამოიყენე 1-2 emoji და ბოლოში დაამატე Call To Action (მაგალითად: 'გვეწვიეთ კაფეში') და შესაბამისი ჰეშთეგები."
  }
}
```

### იმპლემენტაციის მითითება:
ბექენდზე გამოიყენეთ უკვე არსებული `geminiProvider` ან `grokProvider` სერვისები. AI-ს მიეცით სისტემური ინსტრუქცია (System Prompt), რომ გააფართოვოს მომხმარებლის მოკლე პრომპტი პროფესიონალურ მარკეტინგულ ინსტრუქციად შესაბამისი პლატფორმისა და ტონისთვის.

---

## 2. კალენდრის ივენთების სურათების მხარდაჭერა (Database & Controller)
ამჟამად კალენდარში პოსტები იტვირთება სურათების გარეშე, რადგან `calendar_events` ცხრილში არ არის სურათის სვეტი. ფრონტენდზე დროებით გამოიყენება სტოკ სურათების მინიატურები.

### ა) ცხრილის მოდიფიკაცია (Supabase/PostgreSQL):
დაამატეთ `image_url` სვეტი `calendar_events` ცხრილს:
```sql
ALTER TABLE public.calendar_events ADD COLUMN image_url TEXT DEFAULT '';
```

### ბ) Controller-ის განახლება (`calendar.controller.ts`):
- [createCalendarEvent](file:///d:/puga/ads-goniflow/ads-goniflow-back/src/controllers/calendar.controller.ts#L90)-ში დაამატეთ `image_url`-ს წაკითხვა `req.body`-დან და ბაზაში ჩაწერა.
- [updateCalendarEvent](file:///d:/puga/ads-goniflow/ads-goniflow-back/src/controllers/calendar.controller.ts#L124)-ში დაამატეთ `image_url` დასაშვებ ველთა სიაში (`allowedFields`).
- `mapEventFromServer` ფუნქცია ფრონტზე უკვე მზადაა მიიღოს `image_url` და აჩვენოს რეალური სურათის thumbnail კალენდარში.

---

## 3. კავშირის შემოწმების ენდფოინთი (`/health`)
ფრონტენდი რეალურ დროში ამოწმებს კავშირს ბექთან, რათა აჩვენოს `🟢 Real AI Mode` ან `🟡 Offline AI Mode`. ამჟამად პინგისთვის გამოიყენება `/projects` მარშრუტი. სასურველია შეიქმნას მსუბუქი სატესტო ენდფოინთი.

### შესაქმნელი ენდფოინთი:
`GET /api/v1/health`

### პასუხი (Response 200):
```json
{
  "success": true,
  "status": "ok"
}
```

---

## 4. Omnipost ბატჩ გენერაცია (ოპტიმიზაციისთვის)
მომხმარებლებს შეუძლიათ მონიშნონ რამდენიმე პლატფორმა ერთდროულად. ფრონტენდი ამჟამად აგზავნის რამდენიმე პარალელურ მოთხოვნას `POST /projects/:projectId/generate`.

ოპტიმალური მუშაობისთვის სასურველია დაემატოს ერთიანი ბატჩ ენდფოინთი:
`POST /api/v1/projects/:projectId/generate/batch`

```json
{
  "platforms": ["facebook", "instagram"],
  "tone": "professional",
  "textPrompt": "ინსტრუქცია..."
}
```
აბრუნებს ყველა დაგენერირებულ პოსტს ერთ მასივში/ობიექტში, რაც შეამცირებს სერვერზე მოთხოვნების რაოდენობას.
