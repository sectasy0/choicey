describe("Stimulus choicey", () => {
  const resultsListSelector = "[data-choicey-target='list'] li"

  it("displays results on click", () => {
    cy.visitPage()
    cy.clickOnSelect()
    cy.get(resultsListSelector).should("have.length", 11)
  })

  it("filters results on base on the search term", () => {
    cy.visitPage()

    cy.enterSearchTerm("china")
    cy.get(resultsListSelector).should("have.length", 1)

    cy.enterSearchTerm("no-results")
    cy.get(resultsListSelector).should('not.exist')
  })

  it("filters results on base on the search term with fuzzy search", () => {
    cy.visitPage("/fuzzy")

    cy.enterSearchTerm("chnia")
    cy.get(resultsListSelector).should("have.length", 2)

    cy.enterSearchTerm("no-results")
    cy.get(resultsListSelector).should('not.exist')
  });
  it("allows adding a new item (addable)", () => {
    cy.visitPage("/addable")
    cy.clickOnSelect()
    cy.enterSearchTerm("NowyTag")
    cy.get(".choicey__addable-button").click()
    cy.get(".choicey__pill").should("contain", "NowyTag")
  })

  it("respects selected items limit", () => {
    cy.visitPage("/limit")
    cy.clickOnSelect()

    cy.get(resultsListSelector).eq(0).find('span').should("contain", "0 / 3")

    // first element in this case is limit label, so we start from index 1
    cy.get(resultsListSelector).eq(1).find("input").click()
    cy.get(resultsListSelector).eq(0).find('span').should("contain", "1 / 3")

    cy.get(resultsListSelector).eq(2).find("input").click()
    cy.get(resultsListSelector).eq(0).find('span').should("contain", "2 / 3")

    cy.get(resultsListSelector).eq(3).find("input").click()
    cy.get(resultsListSelector).eq(0).find('span').should("contain", "3 / 3")
    let limitReachedText = cy.get(resultsListSelector).eq(0).find('span').find('span')
    limitReachedText.should("contain", "(limit reached)")
    limitReachedText.should("have.class", "choicey__limit-reached")

    cy.get(resultsListSelector).eq(4).find("input").should("be.disabled")
  })

  it("works in single select mode", () => {
    cy.visitPage("/single")
    cy.clickOnSelect()
    cy.get(resultsListSelector).eq(0).find("input").click()
    cy.get(".choicey__pill").should("have.length", 1)
    cy.clickOnSelect()
    cy.get(resultsListSelector).eq(1).find("input").click()
    cy.get(".choicey__pill").should("have.length", 1)
  })

  it("removes selected item on pill delete", () => {
    cy.visitPage()
    cy.clickOnSelect()
    cy.get(resultsListSelector).eq(0).find("input").click()
    cy.get(".choicey__pill-delete").click()
    cy.get(".choicey__pill").should("not.exist")
  })

  it("shows tag count when enabled", () => {
    cy.visitPage("/show-tag-count")
    cy.clickOnSelect()
    cy.get(resultsListSelector).eq(0).find("input").click()
    cy.get(resultsListSelector).eq(1).find("input").click()
    cy.get(".choicey__pill").should("contain", "2")
  })

  it("supports keyboard navigation and backspace", () => {
    cy.visitPage()
    cy.clickOnSelect()
    cy.get("body").type("{downarrow}{downarrow}{enter}")
    cy.get(".choicey__pill").should("have.length", 1)
    cy.get("body").type("{backspace}")
    cy.get(".choicey__pill").should("not.exist")
  })

  it("does not allow interaction when disabled", () => {
    cy.visitPage("/disabled")
    cy.get(".choicey__container").should("have.class", "choicey__disabled")
    cy.clickOnSelect()
    cy.get(".choicey__dropdown").should("not.have.class", "choicey__dropdown--open")
    cy.get('[data-choicey-target="search"]').should('be.disabled')
    cy.get('[data-choicey-target="search"]').should('not.be.focused')
    cy.get(".choicey__dropdown").should('not.be.visible')
  })

  it("loads items from preload API on mount", () => {
    cy.visitPage("/preload")
    cy.clickOnSelect()
    // Sprawdź, że lista jest wypełniona danymi z API (np. samochody)
    cy.get(resultsListSelector).should("have.length.greaterThan", 0)
    cy.get(resultsListSelector).first().should("contain.text", "Toyota")
  })

  it("filters items using remote search API", () => {
    cy.visitPage("/remote-search")
    cy.clickOnSelect()
    cy.enterSearchTerm("BMW")
    // check if results are filtered based on remote search API response
    cy.get(resultsListSelector).should("have.length", 1)
    cy.get(resultsListSelector).first().should("contain.text", "BMW")
    // check if no results message is shown when remote search returns empty array
    cy.enterSearchTerm("no-such-car")
    cy.get(resultsListSelector).should('not.exist')
  })

  it("supports preload + remote search together", () => {
    cy.visitPage("/preload-remote")
    cy.clickOnSelect()
    
    // preload works
    cy.get(resultsListSelector).should("have.length.greaterThan", 0)
    
    // remote search works
    cy.enterSearchTerm("Toyota")
    cy.get(resultsListSelector).should("have.length", 1)
    cy.get(resultsListSelector).first().should("contain.text", "Toyota")
  })

  it("renders grouped items correctly", () => {
      cy.visit("/groups")
      cy.clickOnSelect()
      // Powinny być widoczne grupy i elementy w grupach
      cy.get(resultsListSelector).should("contain.text", "Europe")
      cy.get(resultsListSelector).should("contain.text", "Asia")
      cy.get(resultsListSelector).should("contain.text", "Poland")
      cy.get(resultsListSelector).should("contain.text", "China")
    })

    it("filters items by element name in groups", () => {
      cy.visit("/groups")
      cy.clickOnSelect()
      cy.enterSearchTerm("Poland")
      cy.get(resultsListSelector).should("have.length", 2) // element name match + group name match
      cy.get(resultsListSelector).eq(0).should("contain.text", "Europe")
      cy.get(resultsListSelector).eq(1).should("contain.text", "Poland")
    })

    it("filters items by group name", () => {
      cy.visit("/groups")
      cy.clickOnSelect()
      cy.enterSearchTerm("Europe")
      // only group match, no element name match
      cy.get(resultsListSelector).should("contain.text", "Poland")
      cy.get(resultsListSelector).should("not.contain.text", "China")
    })

    it("supports fuzzy search in groups", () => {
      cy.visit("/groups-fuzzy")
      cy.clickOnSelect()
      cy.enterSearchTerm("polan")
      cy.get(resultsListSelector).should("have.length.greaterThan", 0)
      cy.get(resultsListSelector).first().should("contain.text", "Poland")
      // fuzzy search should also match group name
      cy.enterSearchTerm("eurp")
      cy.get(resultsListSelector).should("contain.text", "Europe")
    })

    it("removes all selected items with clear all button", () => {
      cy.visitPage("/clear-all")
      cy.clickOnSelect()
      cy.get(resultsListSelector).eq(0).find("input").click()
      cy.get(resultsListSelector).eq(1).find("input").click()
      cy.get(".choicey__pill--delete_all").click()
      cy.get(".choicey__pill").should("not.exist")
    })

    it("renders preselected values correctly", () => {
      cy.visitPage("/preselected")
      cy.get(".choicey__pill").should("contain", "Poland")
    })

    it("renders preview outside input", () => {
      cy.visitPage("/preview-outside")
      cy.get(".choicey__preview").should("contain", "Poland")
    })

    it("selects and unselects all items in group via group checkbox", () => {
      cy.visit("/group-checkbox")
      cy.clickOnSelect()
      cy.get('.choicey__group-checkbox').eq(0).click()
      cy.get(resultsListSelector).eq(1).find("input").should("be.checked")
      cy.get(resultsListSelector).eq(2).find("input").should("be.checked")
      cy.get('.choicey__group-checkbox').eq(0).click()
      cy.get(resultsListSelector).eq(1).find("input").should("not.be.checked")
      cy.get(resultsListSelector).eq(2).find("input").should("not.be.checked")
    })

    it("does not allow adding duplicate item", () => {
      cy.visitPage("/addable")
      cy.clickOnSelect()
      cy.enterSearchTerm("Poland")
      cy.get(".choicey__addable-button").should('not.exist')
    })

    it("shows all items after clearing search input", () => {
      cy.visitPage()
      cy.clickOnSelect()
      cy.enterSearchTerm("china")
      cy.get(resultsListSelector).should("have.length", 1)
      cy.get('[data-choicey-target="search"]').clear()
      cy.get(resultsListSelector).should("have.length", 11)
    })

    it("fires events on add/remove", () => {
      cy.visitPage()
      cy.window().then(win => {
        const added = cy.spy();
        const removed = cy.spy();

        const controller = win.document.querySelector('[data-controller="choicey"]')

        controller.addEventListener('choicey-added', added)
        controller.addEventListener('choicey-removed', removed)
        cy.clickOnSelect()
        cy.get(resultsListSelector).eq(0).find("input").click()
        cy.wrap(added).should('have.been.called')
        cy.get(".choicey__pill-delete").click()
        cy.wrap(removed).should('have.been.called')
      })
    })

    it("reacts to disabled attribute change", () => {
      cy.visitPage()

      cy.window().should((win) => {
        expect(win.Stimulus.controllers).to.exist
      }, { timeout: 50000 })

      const controller = cy.get('[data-controller="choicey"]')

      controller.invoke('attr', 'data-choicey-disabled-value', 'true')
      cy.get('.choicey__container').should('have.class', 'choicey__disabled')

      cy.get('.choicey__container').click()
      cy.get('.choicey__dropdown').should('not.have.class', 'choicey__dropdown--open')

      cy.wait(1000)

      cy.window().should((win) => {
        const c = win.document.querySelector('[data-controller="choicey"]')
        c.setAttribute('data-choicey-disabled-value', 'false')
      });
      cy.get('.choicey__container').should('not.have.class', 'choicey__disabled')

      cy.get('.choicey__container').click()
      cy.get('.choicey__dropdown').should('have.class', 'choicey__dropdown--open')
    })

    it("searches case-insensitive and with diacritics", () => {
      cy.visitPage()
      cy.clickOnSelect()
      cy.enterSearchTerm("polAND")
      cy.get(resultsListSelector).should("contain.text", "Poland")
      cy.enterSearchTerm("francE")
      cy.get(resultsListSelector).should("contain.text", "France")
    })

    it("shows no results message when nothing found", () => {
      cy.visitPage()
      cy.clickOnSelect()
      cy.enterSearchTerm("xyzxyzxyz")
      cy.get('.choicey__no-result').should('be.visible')
    })

  it("renders custom classes and disables item", () => {
    cy.visitPage("/custom-classes")
    cy.clickOnSelect()
    cy.get(resultsListSelector).eq(2).should("have.class", "bg-secondary")
    cy.get(resultsListSelector).eq(2).find("input").should("be.disabled")
  })
})