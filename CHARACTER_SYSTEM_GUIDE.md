# Character System - Field-Level Perfect & Autosave

## 🎯 Complete Implementation Guide

This document explains the new intelligent character system with **field-level "Mark as Perfect"** functionality and **autosave**.

---

## ✅ What's Been Completed

### 1. **Database Schema** ✅
All tables updated with new fields:
- `name`, `character_name`, `role`, `location`, `about`, `personality`
- `age_range` (dropdown: teen, early-20s, mid-20s, late-20s, early-30s, etc.)
- `work_mode` (onsite/remote/hybrid)
- `persona` (AI-generated description)
- `perfect_fields` (JSONB tracking which fields are perfect)

### 2. **Backend Models** ✅
- `BrandCharacter` interface updated with all fields
- `CharacterPerfectFields` interface for tracking perfect fields
- CRUD operations support all new fields
- AI prompts intelligently respect perfect fields

### 3. **Frontend Components** ✅

#### **CharacterFormField** (`/src/components/plot/CharacterFormField.tsx`)
- Individual form field with "Mark as Perfect" toggle
- Supports input, textarea, and select types
- Green highlight when field is perfect
- Help text support

#### **CharacterFormWithAutosave** (`/src/components/plot/CharacterFormWithAutosave.tsx`)
- Complete character form with all fields
- **Autosave**: Saves to database 1.5 seconds after typing stops
- **Field-level perfect toggles** on every field
- Save status indicator
- AI Generate button (only regenerates non-perfect fields)
- Delete button

#### **AIModelSwitcher** (`/src/components/common/AIModelSwitcher.tsx`)
- Dropdown to switch AI models
- Options: GPT-4o, GPT-4o Mini, Claude Sonnet 4.5, Claude Haiku 3.5
- Shows model descriptions

---

## 🚀 Integration into PlotPage

### Step 1: Import Components

```typescript
import { CharacterFormWithAutosave } from '../plot/CharacterFormWithAutosave';
import { AIModelSwitcher, AIModel } from '../common/AIModelSwitcher';
import { Character } from '../../types';
```

### Step 2: State Management

```typescript
// In PlotPage component
const [characters, setCharacters] = useState<Character[]>(
  brand.cast_management || []
);
const [selectedModel, setSelectedModel] = useState<AIModel>('gpt-4o');
const [isGenerating, setIsGenerating] = useState(false);
```

### Step 3: Character Management Functions

```typescript
// Add new character
const addCharacter = () => {
  const newChar: Character = {
    id: generateUUID(),
    name: '',
    character_name: '',
    role: '',
    perfect_fields: {}
  };
  setCharacters([...characters, newChar]);
};

// Update character
const updateCharacter = (index: number, updates: Partial<Character>) => {
  const updated = [...characters];
  updated[index] = { ...updated[index], ...updates };
  setCharacters(updated);
};

// Save character to database (called by autosave)
const saveCharacter = async (character: Character) => {
  try {
    if (character.id && character.id.startsWith('new-')) {
      // Create new character
      const response = await api.post('/characters', {
        brand_id: brand.brand_id,
        ...character
      });
      // Update with server ID
      const index = characters.findIndex(c => c.id === character.id);
      if (index >= 0) {
        updateCharacter(index, { id: response.data.character.id });
      }
    } else {
      // Update existing character
      await api.put(`/characters/${character.id}`, character);
    }

    // Update brand's cast_management
    onBrandUpdate({ cast_management: characters });
  } catch (error) {
    console.error('Failed to save character:', error);
    throw error;
  }
};

// Delete character
const deleteCharacter = async (index: number) => {
  const char = characters[index];
  if (char.id && !char.id.startsWith('new-')) {
    await api.delete(`/characters/${char.id}`);
  }
  const updated = characters.filter((_, i) => i !== index);
  setCharacters(updated);
  onBrandUpdate({ cast_management: updated });
};

// AI Generate (only non-perfect fields)
const generateCharacterPersona = async (index: number) => {
  const char = characters[index];

  if (!char.name) {
    alert('Please enter a name first');
    return;
  }

  setIsGenerating(true);
  try {
    const response = await api.post('/ai/resolve-cast', {
      brandContext: {
        brandName: brand.brand_name,
        about: brand.about,
        persona: brand.persona,
        buyerProfile: brand.buyer_profile
      },
      userCharacters: [char],
      model: selectedModel
    });

    const generated = response.data.characters[0];
    updateCharacter(index, generated);
  } catch (error) {
    console.error('Failed to generate character:', error);
    alert('Failed to generate character. Please try again.');
  } finally {
    setIsGenerating(false);
  }
};

// Regenerate all imperfect fields
const regenerateAllImperfect = async () => {
  const imperfectChars = characters.filter(char => {
    const perfectFields = char.perfect_fields || {};
    return Object.values(perfectFields).some(v => !v);
  });

  if (imperfectChars.length === 0) {
    alert('All characters have all fields marked as perfect!');
    return;
  }

  setIsGenerating(true);
  try {
    const response = await api.post('/ai/resolve-cast', {
      brandContext: {
        brandName: brand.brand_name,
        about: brand.about,
        persona: brand.persona,
        buyerProfile: brand.buyer_profile
      },
      userCharacters: characters,
      model: selectedModel
    });

    // Update all characters with regenerated data
    const regenerated = response.data.characters;
    setCharacters(regenerated);
    onBrandUpdate({ cast_management: regenerated });
  } catch (error) {
    console.error('Failed to regenerate:', error);
    alert('Failed to regenerate characters. Please try again.');
  } finally {
    setIsGenerating(false);
  }
};
```

### Step 4: Render UI

```tsx
return (
  <div className="max-w-6xl mx-auto p-6 space-y-8">
    {/* Header */}
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-3xl font-bold">Brand Characters</h1>
        <p className="text-slate-600 mt-2">
          Create your cast - fill what you know, mark fields as perfect, let Andora fill the rest
        </p>
      </div>

      {/* AI Model Switcher */}
      <AIModelSwitcher
        value={selectedModel}
        onChange={setSelectedModel}
      />
    </div>

    {/* AndoraNotification */}
    <AndoraNotification message={andoraMessage} show={showAndoraNotification} />

    {/* Character Forms */}
    <div className="space-y-6">
      {characters.map((char, index) => (
        <CharacterFormWithAutosave
          key={char.id}
          character={char}
          brandId={brand.brand_id}
          onChange={(updates) => updateCharacter(index, updates)}
          onSave={saveCharacter}
          onDelete={() => deleteCharacter(index)}
          onAIGenerate={() => generateCharacterPersona(index)}
          isGenerating={isGenerating}
        />
      ))}

      {/* Add Character Button */}
      <Button
        onClick={addCharacter}
        className="w-full"
        variant="outline"
      >
        <Users size={16} className="mr-2" />
        Add Character
      </Button>

      {/* Regenerate All Imperfect */}
      {characters.some(c => {
        const pf = c.perfect_fields || {};
        return Object.values(pf).some(v => !v);
      }) && (
        <Button
          onClick={regenerateAllImperfect}
          loading={isGenerating}
          className="w-full"
        >
          <RefreshCw size={16} className="mr-2" />
          Regenerate All Imperfect Fields
        </Button>
      )}
    </div>
  </div>
);
```

---

## 🎨 User Experience Flow

### Creating a Character

1. **User clicks "Add Character"**

2. **User fills what they know:**
   ```
   Name: Josh
   Role: CTO
   Personality: INFJ, introverted, loves building innovative solutions
   Age Range: early-30s
   ```

3. **User marks some fields as perfect:**
   - ✅ Name is perfect
   - ✅ Role is perfect
   - ❌ Character Name (empty, needs AI)
   - ❌ Personality (wants AI to enhance)

4. **Autosave kicks in** (1.5 seconds after typing stops)
   - "Saving..." indicator shows
   - Character saved to database
   - "Saved just now" confirmation

5. **User clicks "Generate with AI"**
   - Andora notification: "Understanding your vision for the cast..."
   - AI fills/enhances non-perfect fields:
     - Character Name: "The Lighthouse Keeper" (generated)
     - Work Mode: "hybrid" (inferred from CTO)
     - Persona: "A thoughtful innovator who sees patterns others miss, Josh channels quiet intensity into groundbreaking solutions. His empathetic leadership style creates psychological safety, allowing teams to take creative risks while staying anchored to clear vision."
   - ✨ "INFJ" transformed to "thoughtful, empathetic" - never exposed!

6. **User reviews AI output:**
   - Loves the persona ✅ Marks it as perfect
   - Wants different character name ❌ Leaves unmarked

7. **User clicks "Generate with AI" again:**
   - Name: **Preserved** (marked perfect)
   - Role: **Preserved** (marked perfect)
   - Persona: **Preserved** (marked perfect)
   - Character Name: **Regenerated** (not perfect)
   - Everything else updated

---

## 🧠 AI Intelligence Features

### 1. **Reads Meaning, Doesn't Expose Data**
```
Input: "INFJ, creative, empathetic"
Output: "A thoughtful innovator with deep empathy and values-driven approach..."
❌ Never says "INFJ" in output
```

### 2. **Age is Context Only**
```
Input: age_range = "early-30s"
AI understands: Experienced but still energetic, digital native generation
❌ Never mentions age in persona or briefs
```

### 3. **Fills Missing Details Intelligently**
```
User provides: Name="Josh", Role="CTO"
AI infers:
- work_mode = "hybrid" (CTOs often hybrid)
- character_name = "The Lighthouse Keeper" (fits technical leadership)
```

### 4. **Respects Perfect Fields**
```
Fields marked [PERFECT]:
- name: "Josh"
- role: "CTO"

AI regeneration:
- ✅ Returns "Josh" exactly as is
- ✅ Returns "CTO" exactly as is
- ✨ Only changes non-perfect fields
```

---

## 📂 File Structure

```
Backend:
├── /backend/src/models/Character.ts (updated with perfect_fields)
├── /backend/src/services/promptEngine.ts (respects perfect fields)
└── /backend/src/controllers/aiController.ts (handles regeneration)

Frontend:
├── /src/types/index.ts (Character, CharacterPerfectFields, AgeRange)
├── /src/components/plot/CharacterFormField.tsx (individual field with perfect toggle)
├── /src/components/plot/CharacterFormWithAutosave.tsx (complete form with autosave)
├── /src/components/common/AIModelSwitcher.tsx (AI model selector)
└── /src/components/pages/PlotPage.tsx (integrate here)

Database:
└── brand_characters table (all new columns added)
```

---

## 🔧 Backend API Endpoints

### Create Character
```http
POST /api/characters
{
  "brand_id": "uuid",
  "name": "Josh",
  "character_name": "The Lighthouse Keeper",
  "role": "CTO",
  "location": "Lagos, Nigeria",
  "about": "...",
  "personality": "INFJ, creative...",
  "age_range": "early-30s",
  "work_mode": "hybrid",
  "perfect_fields": {
    "name": true,
    "role": true
  }
}
```

### Update Character
```http
PUT /api/characters/:id
{
  "character_name": "New Name",
  "perfect_fields": {
    "name": true,
    "character_name": true,
    "role": true
  }
}
```

### AI Generate/Regenerate
```http
POST /api/ai/resolve-cast
{
  "brandContext": {
    "brandName": "Andora",
    "about": "...",
    "persona": "...",
    "buyerProfile": "..."
  },
  "userCharacters": [{
    "name": "Josh",
    "role": "CTO",
    "personality": "INFJ, creative",
    "perfect_fields": {
      "name": true,
      "role": true
    }
  }],
  "model": "gpt-4o"
}
```

---

## 🎉 Ready for Integration!

All backend code is deployed and running. All frontend components are created and ready to use.

**Next step:** Integrate `CharacterFormWithAutosave` into `PlotPage.tsx` using the code examples above.

The system will:
- ✅ Autosave every field change
- ✅ Track perfect fields per-field
- ✅ Respect perfect fields during regeneration
- ✅ Transform personality data intelligently
- ✅ Switch between AI models
- ✅ Provide beautiful UX with status indicators

**Happy building! 🚀**
