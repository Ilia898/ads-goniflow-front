# Backend ინსტრუქცია — Calendar API & Security

> ფრონტი მზადაა. ამ ცვლილებების შემდეგ კალენდრის მონაცემები სერვერზე შეინახება.

---

## 1. DB — `calendar_events` ცხრილი

Supabase Dashboard → SQL Editor-ში გაუშვე:

```sql
CREATE TABLE IF NOT EXISTS public.calendar_events (
    id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    project_id  uuid        REFERENCES public.projects(id) ON DELETE CASCADE,
    platform    text        NOT NULL DEFAULT 'facebook',
    tone        text        NOT NULL DEFAULT 'professional',
    headline    text        DEFAULT '',
    text        text        DEFAULT '',
    cta         text        DEFAULT '',
    start_time  timestamptz NOT NULL,
    all_day     boolean     NOT NULL DEFAULT false,
    created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS calendar_events_user_id_idx
    ON public.calendar_events(user_id);
CREATE INDEX IF NOT EXISTS calendar_events_project_id_idx
    ON public.calendar_events(project_id);

ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own calendar events"
    ON public.calendar_events FOR ALL
    USING  (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
```

---

## 2. ახალი Route ფაილი: `src/routes/calendar.routes.ts`

```typescript
import { Router } from "express";
import { requireAuth } from "../middlewares/auth.middleware.js";
import {
    getCalendarEvents,
    createCalendarEvent,
    updateCalendarEvent,
    deleteCalendarEvent,
} from "../controllers/calendar.controller.js";

const router = Router();
router.use(requireAuth); // ყველა route დაცულია

router.get("/",         getCalendarEvents);
router.post("/",        createCalendarEvent);
router.put("/:id",      updateCalendarEvent);
router.delete("/:id",   deleteCalendarEvent);

export default router;
```

---

## 3. ახალი Controller: `src/controllers/calendar.controller.ts`

```typescript
import type { Request, Response, NextFunction } from "express";
import { supabase } from "../config/supabase.js";

// GET /api/v1/calendar
export async function getCalendarEvents(req: Request, res: Response, next: NextFunction) {
    try {
        const userId = req.user!.id;
        const { data, error } = await supabase
            .from("calendar_events")
            .select("*")
            .eq("user_id", userId)
            .order("start_time", { ascending: true });

        if (error) throw new Error(error.message);
        res.json({ success: true, data: data ?? [] });
    } catch (err) {
        next(err);
    }
}

// POST /api/v1/calendar
export async function createCalendarEvent(req: Request, res: Response, next: NextFunction) {
    try {
        const userId = req.user!.id;
        const { project_id, platform, tone, headline, text, cta, start_time, all_day } = req.body;

        if (!start_time) {
            res.status(400).json({ success: false, error: "start_time is required" });
            return;
        }

        const { data, error } = await supabase
            .from("calendar_events")
            .insert({
                user_id:    userId,
                project_id: project_id ?? null,
                platform:   platform   ?? "facebook",
                tone:       tone       ?? "professional",
                headline:   headline   ?? "",
                text:       text       ?? "",
                cta:        cta        ?? "",
                start_time,
                all_day:    all_day    ?? false,
            })
            .select()
            .single();

        if (error) throw new Error(error.message);
        res.status(201).json({ success: true, data });
    } catch (err) {
        next(err);
    }
}

// PUT /api/v1/calendar/:id
export async function updateCalendarEvent(req: Request, res: Response, next: NextFunction) {
    try {
        const userId = req.user!.id;
        const { id } = req.params;

        const allowedFields = ["platform", "tone", "headline", "text", "cta", "start_time", "all_day", "project_id"];
        const updates: Record<string, unknown> = {};
        for (const field of allowedFields) {
            if (req.body[field] !== undefined) updates[field] = req.body[field];
        }

        const { data, error } = await supabase
            .from("calendar_events")
            .update(updates)
            .eq("id", id)
            .eq("user_id", userId) // RLS extra safety
            .select()
            .single();

        if (error) throw new Error(error.message);
        if (!data) {
            res.status(404).json({ success: false, error: "Event not found" });
            return;
        }
        res.json({ success: true, data });
    } catch (err) {
        next(err);
    }
}

// DELETE /api/v1/calendar/:id
export async function deleteCalendarEvent(req: Request, res: Response, next: NextFunction) {
    try {
        const userId = req.user!.id;
        const { id } = req.params;

        const { error } = await supabase
            .from("calendar_events")
            .delete()
            .eq("id", id)
            .eq("user_id", userId);

        if (error) throw new Error(error.message);
        res.json({ success: true, message: "Event deleted successfully" });
    } catch (err) {
        next(err);
    }
}
```

---

## 4. Route-ის რეგისტრაცია: `src/routes/route.ts`

```typescript
// არსებულ route.ts-ში დაამატე:
import calendarRoutes from "./calendar.routes.js";

// router.use(...) ბლოკში:
router.use("/calendar", calendarRoutes);
```

---

## 5. `POST /auth/login` — Rate Limit

`src/routes/auth.routes.ts`-ში:

```typescript
// ახლა:
router.post("/login", login);

// შეცვალე:
router.post("/login", authLimiter, login);
```

---

## 6. CORS URL — `.env`-ში ჩაამატე

```env
CORS_URL=http://localhost:3000
```

---

## API კონტრაქტი (Frontend ელოდება ამ Response-ებს)

### `GET /api/v1/calendar`
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "project_id": "uuid | null",
      "platform": "facebook",
      "tone": "professional",
      "headline": "პოსტის სათაური",
      "text": "ტექსტი",
      "cta": "Shop Now",
      "start_time": "2026-07-10T14:00:00.000Z",
      "all_day": false,
      "created_at": "..."
    }
  ]
}
```

### `POST /api/v1/calendar` — Request Body
```json
{
  "project_id": "uuid | null",
  "platform":   "facebook",
  "tone":       "professional",
  "headline":   "სათაური",
  "text":       "ტექსტი",
  "cta":        "Shop Now",
  "start_time": "2026-07-10T14:00:00.000Z",
  "all_day":    false
}
```
**Response (201):** `{ "success": true, "data": { ...event row } }`

### `PUT /api/v1/calendar/:id`
Body: ნებისმიერი ველი ზემოდან (ნაწილობრივი update).  
**Response (200):** `{ "success": true, "data": { ...updated row } }`

### `DELETE /api/v1/calendar/:id`
**Response (200):** `{ "success": true, "message": "Event deleted successfully" }`

---

> **მნიშვნელოვანი:** `start_time` backend-ში (timestamptz), frontend-ში — `start`. ეს mapping ფრონტმა გაარგება ავტომატურად.
