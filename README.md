# Choicey – Stimulus Select on steroids

Choicey is a modern, highly customizable select and dropdown component for Stimulus, supporting static, preloaded, and remote data, grouped options, selection limits, addable items, fuzzy search (Fuse.js), and full accessibility. Ideal for advanced forms, tag selectors, and dynamic UIs in any web app.

---

## Table of Contents

- [Features](#features)
- [Planned Features & Roadmap](#planned-features--roadmap)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Usage Examples](#usage-examples)
  - [1. Basic Usage](#1-basic-usage)
  - [2. Chose single element mode](#2-chose-single-element-mode)
  - [3. Disabling single value](#3-disabling-single-option)
  - [4. Selected Items Limit](#4-selected-items-limit)
  - [5. Showing Only Count](#5-showing-only-count)
  - [6. Preloading Items from API](#6-preloading-items-from-api)
  - [7. Remote Search](#7-remote-search)
  - [8. Preload + Remote Search](#8-preload--remote-search)
  - [9. Preselected Values](#9-preselected-values)
  - [10. Tag preview outside input](#10-tag-preview-outside-input)
  - [11. Adding New Items](#11-adding-new-items)
  - [12. Customizing Item Appearance](#12-customizing-item-appearance)
  - [13. Custom Classes](#13-custom-classes)
  - [14. Accessing Selected Values](#14-accessing-selected-values)
  - [15. Keyboard Navigation](#15-keyboard-navigation)
  - [16. Events](#16-events)
  - [17. Disabled Mode](#17-disabled-mode)
  - [18. Grouped Items (Optgroup)](#18-grouped-items-optgroup)
  - [19. Fuzzy Search Configuration (Fuse.js)](#19-fuzzy-search-configuration-fusejs)
- [Accessibility](#accessibility)
- [Server API](#server-api)
- [Contributing](#contributing)
- [License](#license)

---

## Features

Choicey offers a comprehensive set of features for building advanced, accessible, and highly customizable select and multiselect inputs:

- **Multiple Data Sources:** Supports static arrays, preloading from API endpoints (with query params), and live remote search (with query params).
- **Single & Multi-Select Modes:** Easily switch between single and multiple selection with a single attribute. Single-select mode can be disabled to allow true multi-select behavior.
- **Grouping & Optgroups:** Organize options into groups with custom group headers and classes.
- **Selection Limits:** Restrict the number of selectable items and display live limit info in the dropdown.
- **Addable Items:** Allow users to add new options on the fly, with support for custom POST params and server-side validation.
- **Custom Classes:** Style every part of the component (li, label, input, span, group header) with your own classes.
- **Tag/Count Display:** Show selected items as pills or a simple count, with a clear-all button for convenience.
- **Preselected Values:** Initialize with preselected options, including support for hidden select sync.
- **Keyboard Accessibility:** Full keyboard navigation (arrows, Enter, Escape, Backspace) and screen reader support.
- **Event Hooks:** Listen for selection, removal, and addable events for seamless integration.
- **Disabled State:** Disable the entire component or individual options.
- **Customizable Placeholders & Messages:** Set custom placeholder, no-results, and addable button texts.
- **Form Integration:** Works natively with HTML forms; selected values are always reflected in the hidden select.
- **Framework Agnostic:** Easy integration with Rails, React, importmap, npm, and more.
- **Security:** All HTML in items and meta is sanitized for XSS safety using DOMPurify.
- **Lightweight & Modern:** No dependencies except Stimulus and DOMPurify (for HTML sanitization).
- **Backspace Tag Removal**: Remove last selected tag when the input is empty.
- **Fuzzy search**: Supports Fuzzy search via Fuse.js for local searching (see [Fuzzy Search (Fuse.js)](#fuzzy-search-fusejs)).
- **Extended error handling**: Supports displaying errors returned from the API (like validation errors for addable) as well as general errors occurring during preload and search operations.
target.
- **Custom Tag Preview Wrapper:** Provide an option to set a custom wrapper for the tags/preview area.

---

## Planned Features & Roadmap

The following enhancements are planned to further improve Choicey:

- **Tree View Support:** Enable hierarchical (tree) selection for complex data structures.
- **Lazy Loading:** Add support for lazy loading of grouped and tree items to optimize performance with large datasets.
- **Custom Item Templates:** Allow overriding the default item rendering template via a user-provided function or 
- **Enhanced Accessibility:** Expand and document full screen reader support for all interactive elements.
- **Extended Metadata:** Add richer support for displaying descriptions or additional metadata below each item name.
- **Pinned Items**: Allow frequently used options to stay at the top of the dropdown.
- **Recent Items**: Automatically display recently selected options for faster re-selection.
- **Select All with Filter Support**: Enable “Select All” that respects current search filters.
- **Virtual Scrolling**: Render only visible items for optimal performance with very large datasets.
- **Select All with Filter Support**: Enable “Select All” that respects current search filters.

## Installation

**npm:**
```bash
yarn add @sectasy0/choicey
```

**importmap-rails:**
```bash
pin "@sectasy0/choicey", to: "https://cdn.jsdelivr.net/npm/@sectasy0/choicey@1.0.2/dist/src/choicey.js"
```


---

## Quick Start

Register the controller in your Stimulus app:
```js
import { Application } from '@hotwired/stimulus'
import { Choicey } from '@sectasy0/choicey'

const application = Application.start()
application.register('choicey', Choicey)
```

---

## Usage Examples

### 1. Basic Usage
Create a multiselect with predefined countries:
```html
<div data-controller="choicey"
     data-choicey-items-value='[
       { "value": "PL", "text": "Poland 🇵🇱" },
       { "value": "CN", "text": "China 🇨🇳" },
       { "value": "BR", "text": "Brazil 🇧🇷" },
       { "value": "DE", "text": "Germany 🇩🇪" },
       { "value": "CA", "text": "Canada 🇨🇦" },
       { "value": "AU", "text": "Australia 🇦🇺" },
       { "value": "IN", "text": "India 🇮🇳" },
       { "value": "FR", "text": "France 🇫🇷" },
       { "value": "ZA", "text": "South Africa 🇿🇦" },
       { "value": "JP", "text": "Japan 🇯🇵" },
       { "value": "MX", "text": "Mexico 🇲🇽" }
     ]'
     data-choicey-search-placeholder-value="Search countries..."
     data-choicey-clear-all-value="true">
  <select multiple class="choicey__hidden" data-choicey-target="hidden" name="countries[]"></select>
</div>
```

#### Size variants
- `choicey__sm` – compact version
- `choicey__md` – medium (default)

---

### 2. Chose single element mode
```html
<div data-controller="choicey" class="choicey__sm"
     data-choicey-preload-url-value="/api/cars"
     data-choicey-single-value="true"
     data-choicey-search-placeholder-value="Search cars...">
  <select class="choicey__hidden" data-choicey-target="hidden" name="cars[]"></select>
</div>
```

---

### 3. Disabling single option
```html
<div data-controller="choicey"
     data-choicey-items-value='[
       { "value": "PL", "text": "Poland 🇵🇱" },
       { "value": "CN", "text": "China 🇨🇳" },
       { "value": "BR", "text": "Brazil 🇧🇷", "disabled": true },
     ]'
     data-choicey-search-placeholder-value="Search countries..."
     data-choicey-clear-all-value="true">
  <select multiple class="choicey__hidden" data-choicey-target="hidden" name="countries[]"></select>
</div>
```

---

### 4. Selected Items Limit
```html
<div data-controller="choicey" class="choicey__sm"
     data-choicey-preload-url-value="/api/cars"
     data-choicey-selected-limit-value="3"
     data-choicey-limit-help-text-value="{n} / {limit} selected"
     data-choicey-limit-reached-text-value="(limit reached)"
     data-choicey-search-placeholder-value="Search cars...">
  <select class="choicey__hidden" data-choicey-target="hidden" name="cars[]"></select>
</div>
```

---

### 5. Showing Only Count
```html
<div data-controller="choicey"
     data-choicey-preload-url-value="/api/cars"
     data-choicey-show-tag-count-value="true"
     data-choicey-selected-preview-text-value="Selected {n} items"
     data-choicey-search-placeholder-value="Search cars...">
  <select class="choicey__hidden" data-choicey-target="hidden" name="cars[]"></select>
</div>
```

---

### 6. Preloading Items from API
```html
<div data-controller="choicey"
     data-choicey-preload-url-value="/api/cars"
     data-choicey-search-placeholder-value="Search cars...">
  <select multiple class="choicey__hidden" data-choicey-target="hidden" name="cars[]"></select>
</div>
```

#### Available options
- `data-choicey-preload-params-value` – Add your params to the preload query (JSON string)

---

### 7. Remote Search
```html
<div data-controller="choicey"
     data-choicey-search-url-value="/api/cars/search"
     data-choicey-search-placeholder-value="Search cars...">
  <select multiple class="choicey__hidden" data-choicey-target="hidden" name="cars[]"></select>
</div>
```
#### Note
  - The API should accept a `q` query param and return a JSON array of items: `[ { "value": "1", "text": "Option 1" }, ... ]`
  - Also receives `preselects` param (comma-separated selected values).

#### Available options
- `data-choicey-search-params-value` - Add your params to the search query (JSON string)


---

### 8. Preload + Remote Search
```html
<div data-controller="choicey"
     data-choicey-preload-url-value="/api/cars"
     data-choicey-search-url-value="/api/cars/search"
     data-choicey-search-placeholder-value="Search cars...">
  <select multiple class="choicey__hidden" data-choicey-target="hidden" name="cars[]"></select>
</div>
```

---

### 9. Preselected Values
```html
<div data-controller="choicey"
     data-choicey-items-value='[
       { "value": "PL", "text": "Poland 🇵🇱" },
       { "value": "DE", "text": "Germany 🇩🇪" },
       { "value": "FR", "text": "France 🇫🇷" }
     ]'
     data-choicey-selected-value='[{ "value": "PL", "text": "Poland 🇵🇱" }]'
     data-choicey-search-placeholder-value="Countries">
  <select multiple class="choicey__hidden" data-choicey-target="hidden" name="countries[]"></select>
</div>
```

### 10. Tag preview outside input
```html
<div data-controller="choicey"
     data-choicey-items-value='[
       { "value": "PL", "text": "Poland 🇵🇱" },
       { "value": "DE", "text": "Germany 🇩🇪" },
       { "value": "FR", "text": "France 🇫🇷" }
     ]'
     data-choicey-selected-value='[{ "value": "PL", "text": "Poland 🇵🇱" }]'
     data-choicey-search-placeholder-value="Countries">
  <div class="mb-2">
    
  </div>
  <select multiple class="choicey__hidden" data-choicey-target="hidden" name="countries[]"></select>
</div>
```

---

### 11. Adding New Items
```html
<div data-controller="choicey"
     data-choicey-addable-url-value="/api/tags"
     data-choicey-addable-button-text-value="Add new tag"
     data-choicey-search-placeholder-value="Search or add tags...">
  <select multiple class="choicey__hidden" data-choicey-target="hidden" name="tags[]"></select>
</div>
```

#### Note
- The server should accept `{ addable: <name>, ...<your additional params> }`
- The server should return the new item as a JSON object: `{ "value": "...", "text": "..." }`.

#### Available options
- `data-choicey-addable-params-value` - Add your params to the addable query (JSON string)

---

### 12. Customizing Item Appearance
```html
<div data-controller="choicey"
     data-choicey-items-value='[
       { "value": "cuckoo", "text": "Cuckoo 🐦", "spanClass":"badge bg-primary" },
       { "value": "macaw", "text": "Macaw 🦜", "spanClass":"badge bg-success" }
     ]'
     data-choicey-search-placeholder-value="Search birds...">
  <select multiple class="choicey__hidden" data-choicey-target="hidden" name="birds[]"></select>
</div>
```

---

### 13. Custom Classes
- `liClass` – class for `<li>`
- `labelClass` – class for `<label>`
- `inputClass` – class for `<input type="checkbox">`
- `spanClass` – class for the `<span>` containing text

Example:
```json
{
  "value": "rooster",
  "text": "Rooster 🐓",
  "liClass": "bg-secondary p-2 mb-1 rounded",
  "labelClass": "d-flex align-items-center",
  "inputClass": "form-check-input me-2",
  "spanClass": "badge bg-danger",
  "disabled": true
}
```

---

### 14. Accessing Selected Values
After selection, the hidden select exposes a `values` property:
```js
const select = document.querySelector('[data-choicey-target="hidden"]')
console.log(select.values) // ["cuckoo", "macaw"]
```

---

### 15. Keyboard Navigation
- **ArrowDown** – move focus to next item
- **ArrowUp** – move focus to previous item
- **Enter** – select focused item
- **Backspace** – remove last selected item
- **Escape** – clear search / close dropdown

---

### 16. Events
| Event              | Detail                                      |
|--------------------|---------------------------------------------|
| choicey-change     | Fired whenever selection changes            |
| choicey-added      | Fired when an item is selected              |
| choicey-removed    | Fired when an item is removed               |
| choicey-addable    | Fired when the user clicks the addable button|

Example:
```js
document.addEventListener('choicey-added', (event) => {
  console.log('Added:', event.detail.item)
})
```

---

### 17. Disabled Mode
```html
<div data-controller="choicey"
     data-choicey-items-value='[
       { "value": "cuckoo", "text": "Cuckoo 🐦" },
       { "value": "macaw", "text": "Macaw 🦜" }
     ]'
     data-choicey-disabled-value="true"
     data-choicey-search-placeholder-value="Disabled example">
  <select multiple class="choicey__hidden" data-choicey-target="hidden" name="birds[]"></select>
</div>
```

---

### 18. Grouped Items (Optgroup)
You can group items under headers by passing an array of group objects, each with a `group` label and an `items` array:
```html
<div data-controller="choicey"
     data-choicey-items-value='[
       { "group": "Fruits", "groupLabelClass": "text-danger", "items": [
         { "value": "apple", "text": "Apple 🍎" },
         { "value": "banana", "text": "Banana 🍌" },
         { "value": "orange", "text": "Orange 🍊" }
       ] },
       { "group": "Vegetables", "items": [
         { "value": "carrot", "text": "Carrot 🥕" },
         { "value": "broccoli", "text": "Broccoli 🥦" },
         { "value": "pepper", "text": "Pepper 🌶️" }
       ] }
     ]'
     data-choicey-search-placeholder-value="Select food..."
     data-choicey-clear-all-value="true">
  <select multiple class="choicey__hidden" data-choicey-target="hidden" name="food[]"></select>
</div>
```

#### Note
- Each group object must have a `group` label and an `items` array.
- All features (search, addable, clear-all, etc.) work with grouped data.
- You can add a custom class to the group label using `groupLabelClass`.

---

### 19. Fuzzy Search Configuration (Fuse.js)

Choicey supports fuzzy searching of local data using [Fuse.js](https://fusejs.io/). This enables advanced, typo-tolerant search for your dropdowns.

- **How to enable:**
  - Fuzzy search is automatically enabled if `window.Fuse` is present (i.e., Fuse.js is loaded globally).
  - If Fuse.js is not present, Choicey falls back to simple substring matching.
- **Configuration:**
  - You can configure Fuse.js options via the `data-choicey-fuse-options` attribute. Pass a JSON string with any [Fuse.js options](https://fusejs.io/api/options.html).
  - Example:
    ```html
    <div data-controller="choicey"
         data-choicey-items-value='[...]'
         data-choicey-fuse-options='{"threshold":0.3,"keys":["text","value"]}'
         ...>
      ...
    </div>
    ```
- **Default keys:** `text`, `value`, `group`.
- **Grouped data:** Fuzzy search works with grouped data and preserves group context in results.

---

## Accessibility
- Arrow navigation in dropdown
- Enter to select
- Escape to close
- Backspace to remove last item

---

## Server API
- Preload/search endpoints must return a JSON array of `{ value, text }` objects.
- addable endpoints must accept `{ addable: <name> }` and return `{ value: <value>, text: <text>}`.
- Remote search receives `q` and `preselects` query params and additional user specified params.
- Errors format `{ message: <error_message> }`

---

## Contributing
Bug reports and pull requests are welcome on GitHub at https://github.com/sectasy0/choicey. Please read the Contributor Covenant code of conduct.

## Acknowledgements

This project builds upon the excellent work from the original [stimulus-multiselect](https://github.com/WizardComputer/stimulus-multiselect) project by WizardComputer.

It extends the original implementation with additional features and adjustments while preserving the core ideas and approach of the upstream library. Many thanks to the original authors and contributors for their work.

---

## License
MIT License
