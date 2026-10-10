# Defect Inspector: upload a photo of any object, get defects + a 3D model

Free to run: **Vercel Hobby** (hosting) + **Google Gemini free tier** (the AI that looks at the photo). No credit card.

## Deploy (about 10 minutes)

1. **Get a free Gemini key.** Go to https://aistudio.google.com, sign in, click "Get API key", create one.
   Do NOT enable billing: on the free tier a flood of visitors can only use up the free quota, it cannot charge you.
2. **Put this folder on GitHub.** Create a free account, click "New repository" (name it `defect-inspector`),
   then "uploading an existing file" and drag in everything inside this folder (the `api` and `public` folders,
   `package.json`, `vercel.json`). Keep the folder structure. Click "Commit changes".
3. **Import it into Vercel.** Go to https://vercel.com, sign up with GitHub, "Add New... > Project", pick the repository.
   Leave the framework as "Other". Before pressing Deploy, open **Environment Variables** and add:
   - `GEMINI_API_KEY` = your key (required)
   - `ACCESS_CODE` = any password you choose (optional: visitors are asked for it once)
   - `GEMINI_MODEL` = a model name from AI Studio (optional; default is `gemini-flash-latest`)
4. Press **Deploy**. Vercel gives you a link like `https://defect-inspector-yourname.vercel.app`. Open it on any phone or laptop.

If you change an environment variable later, press "Redeploy" for it to take effect.

## Troubleshooting
| You see | Meaning | Fix |
|---|---|---|
| "The site owner has not set the API key yet" | `GEMINI_API_KEY` missing | add it in Vercel > Settings > Environment Variables, redeploy |
| "The free AI quota is used up" | Gemini free limits (a few requests per minute, a few hundred a day; Google can change them) | wait a minute, or try tomorrow |
| "The AI service had a problem" | wrong key, or the model name is not available on the free tier | check the key; set `GEMINI_MODEL` to a Flash model listed in AI Studio |
| Asked for an access code | you set `ACCESS_CODE` | type it |
| 3D box stays empty | the browser blocked WebGL | try Chrome, or another device |

## Know before you share it
- **Personal use only:** Vercel's free Hobby plan is for personal, non-commercial use. For a business, use their paid plan.
- **Privacy:** on the free tier Google may use photos to improve its models and people may review them. Do not upload private or customer photos.
- **Accuracy:** the defects are an AI's visual judgement from one photo, not a measurement. Box positions can be off.
  The 3D is an estimate (round objects are wrapped with your photo, everything else is an outline cut-out); hidden sides are guesses.
- three.js (`public/three.min.js`) is MIT licensed.
