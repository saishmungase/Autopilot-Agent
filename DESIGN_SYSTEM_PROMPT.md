# Design System Prompt - SecurePulse Insurance Style

Use this prompt to apply the same design system, colors, and theme to any other website or application.

---

## 🎨 Design System Implementation Prompt

```
Please implement the following premium dark theme design system with glassmorphism effects:

### COLOR PALETTE

**Primary Colors:**
- Background: `oklch(0.18 0.012 250)` - Matte charcoal/slate dark
- Foreground: `oklch(0.985 0.003 250)` - Near white text
- Card: `oklch(0.22 0.015 250)` - Slightly lighter than background
- Emerald (Primary): `oklch(0.72 0.18 155)` - Vibrant emerald green
- Electric Blue (Accent): `oklch(0.68 0.2 240)` - Bright electric blue

**Secondary Colors:**
- Secondary: `oklch(0.28 0.02 250)` - Dark gray
- Muted: `oklch(0.26 0.015 250)` - Muted dark
- Muted Foreground: `oklch(0.7 0.02 250)` - Light gray text
- Border: `oklch(1 0 0 / 10%)` - Subtle white border with 10% opacity
- Input: `oklch(1 0 0 / 12%)` - Input border with 12% opacity

**Gradient Accents:**
- Primary Gradient: `linear-gradient(135deg, oklch(0.72 0.18 155), oklch(0.68 0.2 240))`
  (Emerald to Electric Blue)
- Hero Background: 
  ```
  radial-gradient(ellipse at top, oklch(0.72 0.18 155 / 0.18), transparent 60%),
  radial-gradient(ellipse at bottom right, oklch(0.65 0.2 240 / 0.18), transparent 60%)
  ```

**Glow Effects:**
- Emerald Glow: `0 0 40px -10px oklch(0.72 0.18 155 / 0.5)`
- Electric Glow: `0 0 40px -10px oklch(0.68 0.2 240 / 0.5)`

### GLASSMORPHISM EFFECTS

**Glass (Light):**
```css
background: oklch(1 0 0 / 0.04);
backdrop-filter: blur(20px);
-webkit-backdrop-filter: blur(20px);
border: 1px solid oklch(1 0 0 / 0.08);
```

**Glass Strong (More Opaque):**
```css
background: oklch(1 0 0 / 0.06);
backdrop-filter: blur(24px);
-webkit-backdrop-filter: blur(24px);
border: 1px solid oklch(1 0 0 / 0.1);
```

### TYPOGRAPHY

**Font Settings:**
- Body: System fonts with `font-feature-settings: "cv11", "ss01"`
- Headings: Font weight 600, tracking tight
- Small text: Uppercase with `tracking-[0.2em]` for labels

**Text Gradient:**
```css
background: linear-gradient(135deg, oklch(0.72 0.18 155), oklch(0.68 0.2 240));
-webkit-background-clip: text;
background-clip: text;
color: transparent;
```

### COMPONENT STYLES

**Buttons (Primary):**
- Background: Gradient accent (emerald to electric)
- Text: White
- Padding: `px-7 py-3.5`
- Border radius: `rounded-full`
- Hover: `scale-[1.02]`
- Shadow: Emerald glow effect

**Cards:**
- Background: Glass or glass-strong
- Border radius: `rounded-2xl` or `rounded-3xl`
- Padding: `p-6` to `p-8`
- Hover: `hover:bg-white/5 hover:border-emerald/30`

**Input Fields:**
- Background: `bg-black/30`
- Border: `border-border`
- Focus: `focus:border-emerald focus:ring-2 focus:ring-emerald/30`
- Border radius: `rounded-xl`
- Padding: `px-4 py-3`

**Navbar:**
- Fixed position with glassmorphic backdrop
- Backdrop blur: `backdrop-blur-xl`
- Glass effect with rounded-full container
- Gradient fade from `background/80` to transparent

**Chat Widget:**
- Fixed bottom-right position
- Floating button: Gradient accent with glow
- Modal: `bg-card/95 backdrop-blur-2xl`
- Header: Gradient accent background
- Messages: User (gradient accent), Bot (secondary bg)

### ANIMATIONS

**Pulse Dot:**
```css
@keyframes pulse-dot {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.6; transform: scale(1.4); }
}
animation: pulse-dot 1.6s ease-in-out infinite;
```

**Slide Up:**
```css
@keyframes slide-up {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}
animation: slide-up 0.3s ease-out;
```

**Hover Effects:**
- Scale: `hover:scale-[1.02]` or `hover:scale-110`
- Opacity: `hover:opacity-90`
- Border: `hover:border-emerald/30`

### SPACING & SIZING

**Border Radius:**
- Small: `rounded-lg` (8px)
- Medium: `rounded-xl` (12px)
- Large: `rounded-2xl` (16px)
- Extra Large: `rounded-3xl` (24px)
- Full: `rounded-full`

**Shadows:**
- Card: `shadow-[0_30px_80px_-20px_oklch(0_0_0/0.6)]`
- Button: Glow effects (emerald or electric)

**Padding:**
- Sections: `px-6 py-24`
- Cards: `p-6` to `p-12`
- Buttons: `px-7 py-3.5`

### LAYOUT PATTERNS

**Hero Section:**
- Large heading: `text-5xl md:text-7xl`
- Gradient text on key phrases
- Trust badge with glass effect
- Dual CTA buttons (primary + secondary)
- Stats cards in grid below

**Section Structure:**
- Max width: `max-w-6xl mx-auto`
- Section spacing: `pb-24`
- Label: Uppercase, small, colored (emerald/electric)
- Heading: Large, semibold, tracking tight
- Description: Muted foreground, max-w-xl

**Grid Layouts:**
- 2 columns on mobile: `grid-cols-2`
- 4 columns on desktop: `md:grid-cols-4`
- Gap: `gap-4`

### INTERACTIVE ELEMENTS

**Links:**
- Default: `text-muted-foreground`
- Hover: `hover:text-foreground transition-colors`
- Phone/Email: `text-emerald hover:underline`

**Form Elements:**
- Labels: Uppercase, small, muted
- Inputs: Dark background with border
- Focus: Emerald border with ring
- Error: Red background with border
- Success: Emerald icon with animation

**Icons:**
- Size: `h-4 w-4` to `h-6 w-6`
- Color: Emerald or electric for accents
- Container: Rounded with gradient background
- Hover: `group-hover:scale-110`

### ACCESSIBILITY

- Smooth scroll: `scroll-behavior: smooth`
- Focus rings: `focus:ring-2 focus:ring-emerald/30`
- Aria labels on interactive elements
- Semantic HTML structure
- Reduced motion support

### RESPONSIVE DESIGN

**Breakpoints:**
- Mobile first approach
- sm: 640px
- md: 768px
- lg: 1024px

**Mobile Adjustments:**
- Hide secondary nav items: `hidden md:flex`
- Stack layouts: `flex-col md:flex-row`
- Reduce text sizes: `text-3xl md:text-5xl`
- Adjust padding: `p-5 md:p-8`

### IMPLEMENTATION NOTES

1. Use Tailwind CSS for utility classes
2. Add custom CSS variables in `:root`
3. Include backdrop-filter support for Safari
4. Use oklch color space for better color consistency
5. Apply animations sparingly for performance
6. Test glassmorphism on different backgrounds
7. Ensure text contrast meets WCAG standards
8. Use CSS custom properties for easy theming

### EXAMPLE COMPONENT

```tsx
// Premium Card with Glassmorphism
<div className="glass-strong rounded-3xl p-8 hover:border-emerald/30 transition-all group">
  <div className="h-11 w-11 rounded-xl bg-gradient-accent flex items-center justify-center mb-4 glow-emerald group-hover:scale-110 transition-transform">
    <Icon className="h-5 w-5 text-white" />
  </div>
  <h3 className="font-semibold mb-2">Card Title</h3>
  <p className="text-sm text-muted-foreground leading-relaxed">
    Card description text
  </p>
</div>
```

Apply this design system consistently across all pages and components for a cohesive, premium look.
```

---

## 📋 Quick Reference

### CSS Variables to Add

```css
:root {
  --radius: 0.875rem;
  --background: oklch(0.18 0.012 250);
  --foreground: oklch(0.985 0.003 250);
  --card: oklch(0.22 0.015 250);
  --primary: oklch(0.72 0.18 155);
  --secondary: oklch(0.28 0.02 250);
  --muted: oklch(0.26 0.015 250);
  --muted-foreground: oklch(0.7 0.02 250);
  --accent: oklch(0.65 0.2 240);
  --border: oklch(1 0 0 / 10%);
  --emerald: oklch(0.72 0.18 155);
  --electric: oklch(0.68 0.2 240);
  --gradient-accent: linear-gradient(135deg, var(--emerald), var(--electric));
}
```

### Utility Classes to Add

```css
.glass { /* Light glassmorphism */ }
.glass-strong { /* Strong glassmorphism */ }
.text-gradient { /* Gradient text */ }
.bg-gradient-accent { /* Gradient background */ }
.glow-emerald { /* Emerald glow shadow */ }
.glow-electric { /* Electric glow shadow */ }
.pulse-dot { /* Pulsing animation */ }
.animate-slide-up { /* Slide up animation */ }
```

---

## 🎯 Usage Instructions

1. Copy the entire prompt above (between the triple backticks)
2. Paste it to your AI assistant when working on a new site
3. Add: "Apply this design system to [describe your site/page]"
4. The AI will implement the same premium dark theme with glassmorphism

## 📦 Files to Reference

If you need the actual implementation files:
- `/frontend/src/app/globals.css` - Complete CSS with all utilities
- `/frontend/src/app/page.tsx` - Component examples
- This design system is production-ready and fully tested

---

**Created for**: SecurePulse Insurance Design System
**Style**: Premium Dark Theme with Glassmorphism
**Colors**: Emerald Green + Electric Blue
**Framework**: Tailwind CSS + Custom Utilities
