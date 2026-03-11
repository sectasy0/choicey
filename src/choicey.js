const activeSelector = "[aria-selected='true']"

import { Controller } from "@hotwired/stimulus"

export default class Choicey extends Controller {
  static targets = ["hidden", "list", "search", "preview", "dropdown", "item", "addable", "inputContainer"]

  static values = {
    items: Array,                 // all available items
    selected: Array,              // currently selected items

    // SEARCH OPTIONS
    searchUrl: String,            // URL for remote search
    searchRemote: { type: Boolean, default: false }, // use remote search
    searchParams: { type: Object, default: {} }, // extra params for search request
    searchFuseOptions: { type: Object, default: {} }, // options for Fuse.js local search
    searchNoResultsText: { type: String, default: 'No results'}, // custom message when no results found
    searchPlaceholder: { type: String, default: 'Search...' }, // placeholder for search input
    searchMinChars: { type: Number, default: 3 }, // min chars to trigger remote search

    // PRELOAD OPTIONS
    preloadUrl: String,           // URL to preload items
    preloadParams: { type: Object, default: {} }, // extra params for preload request

    // ADDABLE OPTIONS
    addableUrl: String,           // URL to post new items
    addableParams: { type: Object, default: {} }, // extra params for addable request
    addableMinChars: { type: Number, default: 3 }, // min chars to trigger addable
    addableButtonText: { type: String, default: "Add tag {n}" }, // text for addable button
    addableErrorText: { type: String, default: "Failed to add item. Please try again." }, // message on addable error

    disabled: { type: Boolean, default: false },  // disables the component
    single: { type: Boolean, default: false },    // allow only one selected item
    selectedPreviewText: { type: String, default: "{n} selected" }, // customizable preview text
    showTagCount: { type: Boolean, default: false }, // show count instead of pills
    clearAll: { type: Boolean, default: false },   // show "clear all" button for multi-select

    remoteErrorText: { type: String, default: "Unable to load results. Please try again." }, // message on remote search error

    // LIMITING OPTIONS
    selectedLimit: { type: Number, default: null },  // max number of selectable items
    limitHelpText: { type: String, default: "{n} / {limit} selected" }, // helper text for limits
    limitReachedText: { type: String, default: "(limit reached)" } // text when limit reached
  }

  /**
   * Returns the list of attributes observed by the component.
   * The Custom Element / Stimulus system calls `attributeChangedCallback`
   * whenever one of these attributes changes.
   * 
   * @returns {string[]} Array of observed attribute names.
   */
  static get observedAttributes() {
    return ["data-choicey-disabled-value"];
  }

  /**
   * Callback triggered when an observed attribute changes.
   * Updates the `disabledValue` state based on the new attribute value.
   * 
   * @param {string} name - The name of the changed attribute.
   * @param {string} oldValue - The previous value of the attribute.
   * @param {string} newValue - The new value of the attribute.
   */
  attributeChangedCallback(name, oldValue, newValue) {
    if (name === "data-choicey-disabled-value") {
      this.disabledValue = newValue === "true" || newValue === true;
    }
  }

  /**
   * Setter for `disabledValue`.
   * 
   * Updates the internal `_disabledValue` state and applies corresponding
   * DOM changes:
   * - Adds/removes the `choicey__disabled` class on the main element and container.
   * - Sets/removes the `disabled` attribute on the search input.
   * - Closes the dropdown if the component is disabled.
   * 
   * @param {boolean} val - The new disabled state.
   */
  set disabledValue(val) {
    this._disabledValue = val;

    const container = this.element.querySelector('[data-choicey-target="container"]');
    if (container) {
      if (val) container.classList.add("choicey__disabled");
      else container.classList.remove("choicey__disabled");
    }

    const searchInput = this.element.querySelector('[data-choicey-target="search"]');
    if (searchInput) {
      if (val) searchInput.setAttribute("disabled", "true");
      else searchInput.removeAttribute("disabled");
    }

    const dropdown = this.element.querySelector('[data-choicey-target="dropdown"]');
    if (dropdown && val) {
      dropdown.classList.remove("choicey__dropdown--open");
    }
  }

  /**
   * Getter for `disabledValue`.
   * Returns the current internal `_disabledValue` state.
   * 
   * @returns {boolean} The current disabled state of the component.
   */
  get disabledValue() {
    return this._disabledValue;
  }

  // ==== Lifecycle: Runs when controller connects ====
  /**
   * Initializes the Choicey component, sets up DOM, search, and Fuse.js.
   * Called automatically when the controller is connected.
   */
  async connect() {
    // Only insert the template if it hasn't been added already (prevents duplication on hot reload)
    if (this.element.querySelector('.choicey__container') == undefined) {
      // Insert main HTML template after hidden select
      this.hiddenTarget.insertAdjacentHTML("afterend", this.template)
    }

    this.remoteFailure = false;

    await Promise.resolve();

    this._observer = new MutationObserver(mutations => {
      for (const m of mutations) {
        if (m.type === "attributes" && m.attributeName === "data-choicey-disabled-value") {
          this.disabledValue = this.element.getAttribute("data-choicey-disabled-value") === "true";
        }
      }
    });
    this._observer.observe(this.element, { attributes: true });

    this.disabledValue = this.element.getAttribute("data-choicey-disabled-value") === "true";

    const outsidePreview = 'data-choicey-__target="preview"'
    this.__previewTarget = this.element.querySelector(`[${outsidePreview}]`) || this.previewTarget;
    this.__isPreviewOutside = this.__previewTarget.getAttribute('data-choicey-__target') === 'preview'
    this.__hasPreviewTarget = !!this.__previewTarget

    // Initialize selected items in DOM
    if (this.selectedValue.length) this.selectedValueChanged()

    // Debounced search to avoid excessive function calls
    this.search = debounce(this.search.bind(this), 300)

    // Enhance hidden <select> with a custom `.values` property
    this.enhanceHiddenSelect()

    // Preload items from remote URL if provided
    if (this.preloadUrlValue) await this.preload()

    // Fuse.js options for local search
    let defaultFuseOptions = { keys: ["text", "value", "group"], threshold: 0.5 }
    const fuseOptions = { 
      ...defaultFuseOptions, 
      ...this.searchFuseOptionsValue
    }

    // Flatten items for Fuse.js search (groups flattened)
    this.itemsForSearch = flattenItems(this.itemsValue);

    // Initialize Fuse.js if available
    this.fuse = window.Fuse != undefined ? new Fuse(this.itemsForSearch, fuseOptions) : null
  }

  disconnect() {
    if (this._observer) this._observer.disconnect();
  }

  /**
   * Enhances hidden select element by adding a `.values` getter.
   * This allows easy access to selected values: hiddenSelect.values -> [1, 2, 3]
   */
  enhanceHiddenSelect() {
    const descriptor = Object.getOwnPropertyDescriptor(this.hiddenTarget, "values")

    if (!descriptor) {
      Object.defineProperty(this.hiddenTarget, "values", {
        get: () => {
          if (this.selectedValue.length <= 0) return []
          return this.selectedValue.map(item => item.value)
        }
      })
    }
  }

  /**
   * Dispatches search to local or remote depending on config.
   */
  search() {
    if (this.searchRemoteValue && this.searchTarget.value.length >= this.searchMinCharsValue) {
      this.listTarget.innerHTML = this.allItems;
      console.log('aaaaaaaaa')
      if (this.searchTarget.value === "") {
        this.toggleDropdown()
        return;
      }
      
      return this.searchRemote()
    }
    this.searchLocal()
  }

  /**
   * Performs remote search: fetches items from server based on query.
   */
  async searchRemote() {
    this.remoteFailure = false;
    this.dropdownTarget.classList.add("choicey__dropdown--open")
    
    try {
      const response = await fetch(this.searchUrlValue + "?" + new URLSearchParams({
        q: this.searchTarget.value,
        preselects: this.selectedValue.map(x => x.value).join(","),
        ...this.searchParamsValue
      }))

      if (!response.ok) {
        this.handleFailure(response, true)
        return;
      }

      const searchedItems = await response.json()
      this.itemsValue = searchedItems
      
      // Ensure checkboxes are checked after DOM update
      setTimeout(() => {
        this.selectedValue.forEach(selected => this.checkItem(selected.value))
      }, 0)
    } catch {
      this.handleFailure(null, false)
    }
  }

  /**
   * Performs local search: filters items based on search input.
   * Uses Fuse.js if available; otherwise falls back to simple string matching.
   * Handles grouping and groupLabelClass restoration.
   */
  searchLocal() {
    this.dropdownTarget.classList.add("choicey__dropdown--open")

    // If search input is empty, show all items and re-check selected
    if (this.searchTarget.value === "") {
      this.listTarget.innerHTML = this.allItems
      this.selectedValue.forEach(selected => this.checkItem(selected.value))
      if (this.selectedValue == 0 && this.itemsValue.length == 0) {
        this.toggleDropdown();
      }
      return
    }
    
    const term = this.searchTarget.value.toLowerCase()
    const selectedValues = new Set(this.selectedValue.map(x => x.value))

    let searched = []
    // Use Fuse.js for fuzzy search if available
    if (this.fuse && typeof this.fuse.search === 'function' && term.trim() !== '') {
      searched = this.fuse.search(term).map(res => {
        // Restore groupLabelClass if missing (important for group styling)
        if (res.item.group && !res.item.groupLabelClass) {
          const groupObj = this.itemsForSearch.find(g => g.group === res.item.group);
          return { ...res.item, groupLabelClass: groupObj && groupObj.groupLabelClass ? groupObj.groupLabelClass : '' };
        }
        return res.item;
      })
    } else {
      searched = this.itemsForSearch.filter(i => {
        const termLower = term.toLowerCase();
        const textMatch = i.text.toLowerCase().includes(termLower);
        const groupMatch = i.group ? i.group.toLowerCase().includes(termLower) : false;
        return textMatch || groupMatch;
      });
    }

    // Find selected items for preview
    const selectedItems = this.itemsForSearch.filter(i => selectedValues.has(i.value))
    // Remove already selected from search results
    searched = searched.filter(i => !selectedValues.has(i.value))

    // If no results, show no results template
    if (!searched.length) {
      this.listTarget.innerHTML = this.noResultsTemplate;
      return;
    }

    // Restore group structure for rendering (regroup flat search results)
    const groupBack = items => {
      const groups = {}
      const groupLabelClassMap = {}
      const singles = []

      if (Array.isArray(this.itemsValue)) {
        this.itemsValue.forEach(g => {
          if (g && g.group && g.groupLabelClass) {
            groupLabelClassMap[g.group] = g.groupLabelClass
          }
        })
      }

      items.forEach(i => {
        if (i.group) {
          if (!groups[i.group]) groups[i.group] = []
          groups[i.group].push(i)
        } else {
          singles.push(i)
        }
      })

      const result = Object.entries(groups).map(([group, items]) => ({ group, groupLabelClass: groupLabelClassMap[group] || '', items }))
      return [...result, ...singles]
    }

    // Render limit label at the top during search, just like in allItems
    let html = '';
    const limit = this.selectedLimitValue;
    if (limit && !this.singleValue) {
      html += this.limitTemplate;
    }

    html += this.items(selectedItems, true);
    html += this.items(groupBack(searched));
    this.listTarget.innerHTML = html;
  }

  /**
   * Preloads items from remote URL on initialization.
   */
  async preload() {
    let url = this.preloadUrlValue
    this.remoteFailure = false;

    if (this.preloadParamsValue) {
      const params = new URLSearchParams(this.preloadParamsValue)
      url += `?${params.toString()}`
    }

    try {
      const response = await fetch(url, {
        method: "GET",
        headers: { "Content-Type": "application/json" }
      })

      if (!response.ok) {
        this.handleFailure(response, true)
        return;
      }

      const items = await response.json()
      this.itemsForSearch = flattenItems(items);
      this.itemsValue = items;
    } catch {
      this.handleFailure(null, false)
    }
  }

  /**
   * Opens or closes the dropdown.
   */
  toggleDropdown() {
    if (this.disabledValue) return

    if (this.dropdownTarget.classList.contains("choicey__dropdown--open")) {
      this.dropdownTarget.classList.remove("choicey__dropdown--open")
      if (this.selectedValue.length > 0) this.inputContainerTarget.style.display = "none"
      this.searchTarget.blur()
      this.searchTarget.value = ""
    } else {
      if (this.itemsValue.length) this.dropdownTarget.classList.add("choicey__dropdown--open")
    }
    this.searchTarget.focus()
  }

  /**
   * Closes dropdown when clicking outside component.
   */
  closeOnClickOutside({ target }) {
    if (this.element.contains(target)) return

    this.dropdownTarget.classList.remove("choicey__dropdown--open")
    if (this.selectedValue.length > 0 && !this.__isPreviewOutside) this.inputContainerTarget.style.display = "none"
    this.searchTarget.value = ""
    if (!this.searchRemoteValue) {
      this.listTarget.innerHTML = this.allItems
      this.selectedValue.forEach(selected => this.checkItem(selected.value))
    }
  }

  /**
   * Updates remote search flag if searchUrl changes.
   */
  searchUrlValueChanged() {
    if (this.searchUrlValue) this.searchRemoteValue = true
  }

  /**
   * Re-renders the list when items array changes.
   */
  itemsValueChanged() {
    if (!this.hasListTarget) return

    if (this.itemsValue.length) {
      this.listTarget.innerHTML = this.allItems
    } else {
      this.listTarget.innerHTML = this.noResultsTemplate
    }
  }
  
  /**
   * Updates preview and hidden select whenever selected items change.
   */
  selectedValueChanged() {
    if (!this.__hasPreviewTarget) return

    // Clear hidden select
    while (this.hiddenTarget.options.length) this.hiddenTarget.remove(0)

    if (this.selectedValue.length > 0) {
      // Render preview: pills or tag count
      if (this.showTagCountValue) {
        let text = this.selectedPreviewTextValue || "{n} selected"
        text = text.replace("{n}", this.selectedValue.length)
        this.__previewTarget.innerHTML = this.pillTemplate({ text: text })
      } else {
        this.__previewTarget.innerHTML = this.pills
      }

      // Sync hidden select options
      this.selectedValue.forEach(selected => {
        const option = document.createElement("option")
        option.text = selected.text
        option.value = selected.value
        option.setAttribute("selected", true)
        this.hiddenTarget.add(option)
      })

      if (!this.searchRemoteValue) {
        this.selectedValue.forEach(selected => this.checkItem(selected.value))
      }
    } else {
      this.searchTarget.style.paddingTop = "0"
      this.inputContainerTarget.style.display = ""
      this.__previewTarget.innerHTML = ""
    }

    // Re-render dropdown list to reflect selected items
    if (this.hasListTarget) {
      this.listTarget.innerHTML = this.allItems
      this.selectedValue.forEach(selected => this.checkItem(selected.value))
    }

    this.element.dispatchEvent(new Event("choicey-change"))
  }

  /**
   * Removes a single item from selection.
   * @param {Event} e - The click event from the remove button on a pill
   */
  removeItem(e) {
    e.stopPropagation()
    const itemToRemove = e.currentTarget.parentNode
    this.selectedValue = this.selectedValue.filter(x => x.value.toString() !== itemToRemove.dataset.value)
    this.uncheckItem(itemToRemove.dataset.value)
    this.element.dispatchEvent(new CustomEvent("choicey-removed", { detail: { id: itemToRemove.dataset.value } }))
  }

  /**
   * Removes all selected items.
   */
  removeItems() {
    this.selectedValue = []
    this.itemTargets.forEach(item => item.checked = false)
    this.element.dispatchEvent(new CustomEvent("choicey-removed", { detail: { id: null } }))
  }

  /**
   * Unchecks a single checkbox in dropdown.
   * @param {string} value - The value of the item to uncheck
   */
  uncheckItem(value) {
    const itemToUncheck = this.listTarget.querySelector(`input[data-value="${value}"]`)
    if (itemToUncheck) itemToUncheck.checked = false
  }

  /**
   * Checks a single checkbox in dropdown.
   * @param {string} value - The value of the item to check
   */
  checkItem(value) {
    const itemToCheck = this.listTarget.querySelector(`input[data-value="${value}"]`)
    if (itemToCheck) itemToCheck.checked = true
  }


  /**
   * Toggles item selection (single or multi-select).
   * Handles both single and multi-select logic.
   * @param {HTMLInputElement} input - The checkbox input element that was toggled
   */
  toggleItem(input) {
    if (this.singleValue) {
      // Single selection mode: deselect previous
      const item = { text: input.dataset.text, value: input.dataset.value }
      this.itemTargets.forEach(el => { if (el !== input) el.checked = false })
      this.selectedValue = [item]
      this.dropdownTarget.classList.remove("choicey__dropdown--open")
      this.element.dispatchEvent(new CustomEvent("choicey-added", { detail: { item } }))
      return
    }

    // Multi-select mode
    const item = { text: input.dataset.text, value: input.dataset.value }
    let newSelectedArray = this.selectedValue

    if (input.checked) {
      newSelectedArray.push(item)

      if (this.focusedItem) {
        this.focusedItem.closest("li").classList.remove("choicey__focused")
        this.focusedItem.removeAttribute("aria-selected")
      }

      input.setAttribute("aria-selected", "true")
      input.closest("li").classList.add("choicey__focused")
      this.element.dispatchEvent(new CustomEvent("choicey-added", { detail: { item } }))
    } else {
      newSelectedArray = newSelectedArray.filter(selected => selected.value.toString() !== item.value)
      this.element.dispatchEvent(new CustomEvent("choicey-removed", { detail: { id: item.value } }))
    }

    this.selectedValue = newSelectedArray
  }

  // ==== Keyboard navigation handlers ====

  onKeyDown(e) {
    const handler = this[`on${e.key}Keydown`]
    if (handler) handler(e)
  }

  onArrowDownKeydown = (event) => {
    const item = this.sibling(true)
    if (item) this.navigate(item)
    event.preventDefault()
  }

  onArrowUpKeydown = (event) => {
    const item = this.sibling(false)
    if (item) this.navigate(item)
    event.preventDefault()
  }

  onBackspaceKeydown = () => {
    if (this.searchTarget.value !== "") return
    if (!this.selectedValue.length) return
    const selected = this.selectedValue
    const value = selected.pop().value
    this.uncheckItem(value)
    this.selectedValue = selected
    this.element.dispatchEvent(new CustomEvent("choicey-removed", { detail: { id: value } }))
  }

  onEnterKeydown = (e) => {
    if (this.focusedItem) this.focusedItem.click()
  }

  onEscapeKeydown = () => {
    this.toggleDropdown()
    if (this.searchTarget.value !== "") {
      this.searchTarget.value = ""
      this.listTarget.innerHTML = this.allItems
      return this.search()
    }
  }

  // ====

  /**
   * Returns the next/previous selectable sibling item for keyboard navigation.
   * @param {boolean} next - If true, returns the next sibling; otherwise, returns the previous sibling.
   */
  sibling(next) {
    const options = this.itemTargets
    const selected = this.focusedItem
    const index = options.indexOf(selected)
    const sibling = next ? options[index + 1] : options[index - 1]
    const def = next ? options[0] : options[options.length - 1]
    return sibling || def
  }


  /**
   * Addable feature: send new item to server and add to selection.
   * @param {Event} e - The click event from the addable button
   */
  async addable(e) {
    e.preventDefault()
    const query = this.searchTarget.value
    if (query === "" || this.itemsValue.some(item => item.text === query)) return

    this.remoteFailure = false;

    try {
      const response = await fetch(this.addableUrlValue, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ addable: query, ...this.addableParamsValue })
      })

      if (response.ok) {
        const addedItem = await response.json()
        this.addAddableItem(addedItem)
      } else {
        this.handleFailure(response, true, this.addableErrorTextValue)
      }
    } catch {
      this.handleFailure(null, true, this.addableErrorTextValue)
    }
  }

  /**
   * Adds a new item (from addable) to the items and selection.
   * @param {Object} addedItem - The item object returned from the server after adding
   */
  addAddableItem(addedItem) {
    this.itemsValue = this.itemsValue.concat(addedItem)
    this.selectedValue = this.selectedValue.concat(addedItem)
    this.searchTarget.value = ""
    this.element.dispatchEvent(new CustomEvent("choicey-added", { detail: { item: addedItem } }))
  }

  /**
   * Highlights/focuses a specific item in dropdown.
   * @param {HTMLElement} target The item element to focus
   */
  navigate(target) {
    const previouslySelected = this.focusedItem
    if (previouslySelected) {
      previouslySelected.removeAttribute("aria-selected")
      previouslySelected.closest("li").classList.remove("choicey__focused")
    }

    target.setAttribute("aria-selected", "true")
    target.closest("li").classList.add("choicey__focused")
    target.scrollIntoView({ behavior: "smooth", block: "nearest" })
  }

  /**
   * Returns the currently focused item in the dropdown.
   * @returns {HTMLElement} The currently focused item element
   */
  get focusedItem() {
    return this.listTarget.querySelector(activeSelector)
  }

  /**
   * Focuses the search input and shows the input container.
   */
  focusSearch() {
    if (this.disabledValue) return

    this.inputContainerTarget.style.display = ""
    this.searchTarget.focus()

    
    if (this.itemsValue.length === 0 && !this.remoteFailure) return
    this.remoteFailure = false
    this.dropdownTarget.classList.add("choicey__dropdown--open")
  }

  /**
   * Dispatches a custom event for addable action.
   */
  addableEvent() {
    if (this.disabledValue) return
    document.dispatchEvent(new CustomEvent("choicey-addable"))
  }

  /**
   * Returns the main HTML template for the component.
   * @returns {String} HTML string for the component's structure
   */
  get template() {
    const isSingle = this.singleValue || this.showTagCountValue

    const containerClasses = [
      "choicey__container", 
      isSingle && "choicey__container--single", 
      this.disabledValue && "choicey__disabled"
    ].filter(Boolean).join(" ")

    const previewClasses = ["choicey__preview", isSingle && "choicey__preview--single"].filter(Boolean).join(" ")

    const preview = this.__hasPreviewTarget ? "" : `<div class="${previewClasses}" data-choicey-target="preview"></div>`

    return `
      <div
        class="${containerClasses}" 
        data-choicey-target="container"
        data-action="mousedown->choicey#toggleDropdown focus->choicey#focusSearch"
        tabindex="0"
        data-turbo-cache="false"
      >
        ${preview}
        <div class="choicey__input-container" data-choicey-target="inputContainer">
          ${this.inputTemplate}
        </div>
      </div>

      <div style="position: relative;" data-action="click@window->choicey#closeOnClickOutside">
        <div class="choicey__dropdown" data-choicey-target="dropdown">
          <ul class="choicey__list" data-choicey-target="list">
            ${this.allItems}
          </ul>
        </div>
      </div>
    `
  }

  /**
   * Returns the template for 'no results' (optionally with addable button).
   * @returns {String} HTML string for 'no results' display
   */
  get noResultsTemplate() {
    const noResultsTemplate = `<div class="choicey__no-result">${this.searchNoResultsTextValue}</div>`
    if (!this.addableUrlValue) return noResultsTemplate

    if (this.searchTarget.value.length < this.addableMinCharsValue) {
      return noResultsTemplate
    }

    return `
      <div class="choicey__no-result">
        <span class="choicey__addable-button" data-action="click->choicey#addable">
          ${this.addableButtonTextValue.replace("{n}", this.searchTarget.value)}
        </span>
      </div>
    `
  }

  /**
   *  Returns the template for remote errors.
   * @param {String} message 
   * @returns {String} HTML string for error display
   */
  errorTemplate(message) {
    return `
      <div class="choicey__no-result choicey__error choicey__error--flex">
        <span class="choicey__error-message">${message || this.remoteErrorTextValue}</span>
      </div>
    `;
  }

  /**
   * Returns the template for the search input.
   * @returns {string} HTML string for the search input element.
   */
  get inputTemplate() {
    return `
      <input 
        type="text" 
        class="choicey__search ${this.singleValue || this.showTagCountValue ? 'choicey__search--single' : ''}" 
        placeholder="${this.searchPlaceholderValue}"
        data-choicey-target="search" ${this.disabledValue === true ? 'disabled' : ''}
        data-action="choicey#search keydown->choicey#onKeyDown focus->choicey#focusSearch"
      >
    `
  }

  /**
   * Renders the list of items (grouped or flat) as HTML.
   * Handles group headers, selection, and limit display.
   * @param {Array} items - Items or groups to render
   * @param {boolean} selected - If true, marks as selected
   * @returns {string} HTML string
   */
  items(items, selected = false) {
    const checked = selected ? "checked" : ""
    let itemsTemplate = ""

    const limit = this.selectedLimitValue;
    const limitReached = limit && this.selectedValue.length >= limit;

    items.forEach((item, groupIdx) => {
      if (item && typeof item === 'object' && Array.isArray(item.items) && item.group) {
        let groupItems = item.items;
        let allSelected = groupItems.length > 0 && groupItems.every(subitem => this.selectedValue.some(sel => sel.value == subitem.value));
        let someSelected = groupItems.some(subitem => this.selectedValue.some(sel => sel.value == subitem.value));
        let groupCheckbox = '';
        if (!this.singleValue) {
          groupCheckbox = `
            <input 
              type="checkbox" 
              class="choicey__group-checkbox" 
              data-group-idx="${groupIdx}" ${allSelected ? 'checked' : ''} 
              ${someSelected && !allSelected ? 'data-indeterminate="true"' : ''} 
              tabindex="-1"
            >
          `;
        }
        itemsTemplate += `
          <li class="choicey__group">
            <span 
              class="choicey__group-label ${item.groupLabelClass || ''}" data-group-idx="${groupIdx}" 
              data-action="click->choicey#toggleGroup"
            >
              ${groupCheckbox}${item.group}
            </span>
            <ul class="choicey__group-list">
        `;
        groupItems.forEach(subitem => {
          // pass limit info to itemTemplate
          itemsTemplate += this.itemTemplate(subitem, checked, limitReached);
        });
        itemsTemplate += `</ul></li>`;
      } else {
        itemsTemplate += this.itemTemplate(item, checked, limitReached)
      }
    })
    setTimeout(() => {
      document.querySelectorAll('.choicey__group-checkbox[data-indeterminate="true"]')
              .forEach(cb => { cb.indeterminate = true; });
    }, 0);
    return itemsTemplate
  }

  /**
   * Handles group checkbox click: toggles selection for all items in group.
   * @param {Event} event - The click event from the group label
   */
  toggleGroup(event) {
    event.stopPropagation();
    const groupIdx = event.currentTarget.getAttribute('data-group-idx');
    const group = this.itemsValue[groupIdx];
    if (!group || !Array.isArray(group.items)) return;
    const groupItems = group.items;
    const allSelected = groupItems.length > 0 && groupItems.every(subitem => this.selectedValue.some(sel => sel.value == subitem.value));
    let newSelected = [...this.selectedValue];
    const limit = this.selectedLimitValue;
    if (allSelected) {
      // unselect only items from this group (remove them from selected)
      newSelected = newSelected.filter(sel => !groupItems.some(subitem => subitem.value == sel.value));
    } else {
      // select all group items (add missing ones), but respect selectedLimit
      let canAdd = limit ? Math.max(0, limit - newSelected.length) : groupItems.length;
      for (const subitem of groupItems) {
        if (!newSelected.some(sel => sel.value == subitem.value) && canAdd > 0) {
          newSelected.push(subitem);
          canAdd--;
        }
      }
    }
    this.selectedValue = newSelected;
    this.selectedValueChanged();
    // re-render list to update checkboxes
    if (this.hasListTarget) {
      this.listTarget.innerHTML = this.items(this.itemsValue);
    }
  }
  
  /**
   * Returns HTML for selected items as pills (or tag count).
   * @returns {string} HTML string for selected items in pill format
   */
  get pills() {
    let itemsTemplate = ""

    if (!(this.singleValue && this.showTagCountValue) && this.clearAllValue == true && this.selectedValue.length > 1) {
      itemsTemplate += `
        <span class="choicey__pill choicey__pill--delete_all">
          <span class="choicey__pill-delete_all" data-action="click->choicey#removeItems">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 30 30" width="12px" height="12px">
              <path d="M25.707,6.293c-0.195-0.195-1.805-1.805-2-2c-0.391-0.391-1.024-0.391-1.414,0c-0.195,0.195-17.805,17.805-18,18c-0.391,0.391-0.391,1.024,0,1.414c0.279,0.279,1.721,1.721,2,2c0.391,0.391,1.024,0.391,1.414,0c0.195-0.195,17.805-17.805,18-18C26.098,7.317,26.098,6.683,25.707,6.293z"/>
              <path d="M23.707,25.707c0.195-0.195,1.805-1.805,2-2c0.391-0.391,0.391-1.024,0-1.414c-0.195-0.195-17.805-17.805-18-18c-0.391-0.391-1.024-0.391-1.414,0c-0.279,0.279-1.721,1.721-2,2c-0.391,0.391-0.391,1.024,0,1.414c0.195,0.195,17.805,17.805,18,18C22.683,26.098,23.317,26.098,23.707,25.707z"/>
            </svg>
          </span>
        </span>
      `
    }

    this.selectedValue.forEach(item => itemsTemplate += this.pillTemplate(item))

    return itemsTemplate
  }

  /**
   * Returns HTML for currently selected items.
   * @returns {string} HTML string for selected items in the dropdown
   */
  get selectedItems() {
    return this.items(this.selectedValue, true)
  }

  /**
   * Returns HTML for all items.
   * @returns {string} HTML string for all items in the dropdown, including limit label if applicable
   */
  get allItems() {
    // Render limit label only once at the top if needed
    let html = '';
    if (this.selectedLimitValue && !this.singleValue) {
      html += this.limitTemplate;
    }
    html += this.items(this.itemsValue);
    return html;
  }

  get limitTemplate() {
    const limit = this.selectedLimitValue;
    const limitReached = limit && this.selectedValue.length >= limit;
    const limitText = this.limitHelpTextValue.replace("{n}", this.selectedValue.length).replace("{limit}", limit);
    return `<li style="cursor: default" class="choicey__group">
      <span class="choicey__group-label choicey__limit-label">
        ${limitText}${limitReached ? ` <span class="choicey__limit-reached">${this.limitReachedTextValue}</span>` : ''}
      </span>
    </li>`;
  }

  /**
   * Renders a single item as HTML (checkbox/radio + label).
   * @param {Object} item - Item to render
   * @param {string} selected - 'checked' if selected
   * @param {boolean} limitReached - If true, disables unselected items
   * @returns {string} HTML string
   */
  itemTemplate(item, selected = "", limitReached = false) {
    var defaultLiClasses = "choicey__item"
    // block options if limit reached or disabled and not already selected
    const isDisabled = item.disabled || (limitReached && !this.selectedValue.some(sel => sel.value == item.value));
    if (isDisabled) defaultLiClasses += " choicey__item--disabled"

    return `
      <li ${item.liClass ? `class="${defaultLiClasses} ${item.liClass}"` : `class="${defaultLiClasses}"`}>
        <label ${item.labelClass ? `class="${item.labelClass}"` : ""}>
          <input type="${this.singleValue ? 'radio' : 'checkbox'}" ${selected} data-value="${item.value}" data-text="${item.text}" data-action="choicey#checkBoxChange" data-choicey-target="item" tabindex="-1" ${item.inputClass ? `class="${item.inputClass}"` : ""} ${isDisabled ? "disabled" : ""}>
          <span ${item.spanClass ? `class="${item.spanClass}"` : ""}>${item.text}</span>
        </label>
      </li>
    `
  }

  /**
   * Handles checkbox/radio change event for an item.
   * @param {Event} event - The change event from the checkbox/radio input
   */
  checkBoxChange(event) {
    event.preventDefault()
    this.searchTarget.focus()
    this.toggleItem(event.currentTarget)
  }

  /**
   * Renders a single selected item as a pill (with delete button if enabled).
   * @param {Object} item - Item to render
   * @returns {string} HTML string
   */
  pillTemplate(item) {
    if (this.showTagCountValue) {
      return  `<span class="choicey__pill">
        <span class="choicey__pill-text">${item.text}</span>
        <span class="choicey__pill-delete" data-action="click->choicey#removeItems">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 30 30" width="12px" height="12px">
            <path d="M25.707,6.293c-0.195-0.195-1.805-1.805-2-2c-0.391-0.391-1.024-0.391-1.414,0c-0.195,0.195-17.805,17.805-18,18c-0.391,0.391-0.391,1.024,0,1.414c0.279,0.279,1.721,1.721,2,2c0.391,0.391,1.024,0.391,1.414,0c0.195-0.195,17.805-17.805,18-18C26.098,7.317,26.098,6.683,25.707,6.293z"/>
            <path d="M23.707,25.707c0.195-0.195,1.805-1.805,2-2c0.391-0.391,0.391-1.024,0-1.414c-0.195-0.195-17.805-17.805-18-18c-0.391-0.391-1.024-0.391-1.414,0c-0.279,0.279-1.721,1.721-2,2c-0.391,0.391-0.391,1.024,0,1.414c0.195,0.195,17.805,17.805,18,18C22.683,26.098,23.317,26.098,23.707,25.707z"/>
          </svg>
        </span>
      </span>`
    }

    if (this.disabledValue) {
      return `<div class="choicey__pill" data-value="${item.value}" title="${item.text}">
        <span class="choicey__pill-text">${item.text}</span>
      </div>`
    } else {
      return `<div class="choicey__pill" data-value="${item.value}" title="${item.text}">
        <span class="choicey__pill-text">${item.text}</span>
        <span class="choicey__pill-delete" data-action="click->choicey#removeItem">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 30 30" width="12px" height="12px">
            <path d="M25.707,6.293c-0.195-0.195-1.805-1.805-2-2c-0.391-0.391-1.024-0.391-1.414,0c-0.195,0.195-17.805,17.805-18,18c-0.391,0.391-0.391,1.024,0,1.414c0.279,0.279,1.721,1.721,2,2c0.391,0.391,1.024,0.391,1.414,0c0.195-0.195,17.805-17.805,18-18C26.098,7.317,26.098,6.683,25.707,6.293z"/>
            <path d="M23.707,25.707c0.195-0.195,1.805-1.805,2-2c0.391-0.391,0.391-1.024,0-1.414c-0.195-0.195-17.805-17.805-18-18c-0.391-0.391-1.024-0.391-1.414,0c-0.279,0.279-1.721,1.721-2,2c-0.391,0.391-0.391,1.024,0,1.414c0.195,0.195,17.805,17.805,18,18C22.683,26.098,23.317,26.098,23.707,25.707z"/>
          </svg>
        </span>
      </div>`
    }
  }

  async handleFailure(response, expectRemoteMessage = false, defaultMessage = this.remoteErrorTextValue) {
    let errorMessage = defaultMessage; // default message

    if (expectRemoteMessage) {
      try {
        const errorData = await response.json();
        if (errorData?.message) {
          errorMessage = errorData.message;
        }
      } catch (e) {
        // no error message in response, keep default errorMessage
      }
    }

    this.listTarget.innerHTML = this.errorTemplate(errorMessage)
    this.remoteFailure = true;
  }
}

// ==== Utilities ====
/**
 * Returns a debounced version of a function.
 * @param {Function} fn - Function to debounce
 * @param {number} delay - Delay in ms
 * @returns {Function}
 */
function debounce(fn, delay) {
  let timeoutId = null
  return (...args) => {
    const callback = () => fn.apply(this, args)
    clearTimeout(timeoutId)
    timeoutId = setTimeout(callback, delay)
  }
}

/**
 * Flattens grouped items into a flat array for Fuse.js and search.
 * Preserves group and groupLabelClass info.
 * @param {Array} items - Array of items or groups
 * @returns {Array} Flat array of items
 */
function flattenItems(items) {
  return items.flatMap(item => {
    if (!item) return []
    if (item.group && Array.isArray(item.items)) {
      return item.items.map(i => ({ 
        ...i, 
        group: item.group, 
        groupLabelClass: item.groupLabelClass || '' 
      }))
    }
    return [{ ...item, group: undefined }]
  })
}

window.debounce = debounce // Expose Choicey globally for testing purposes

export { Choicey }