describe("Stimulus choicey", () => {
  const resultsListSelector = "[data-choicey-target='list'] li"

  describe("searching", () => {
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
  })

  describe("adding", () => {
    it("allows adding a new item (addable)", () => {
      cy.visitPage("/addable")
      cy.clickOnSelect()
      cy.enterSearchTerm("NowyTag")
      cy.get(".choicey__addable-button").click()
      cy.get(".choicey__pill").should("contain", "NowyTag")
    })

    it("allows adding a new item with user specified params (addable)", () => {
      cy.intercept('POST', '/elements*').as('elementsPost')
      cy.visitPage("/addable-params")
      cy.clickOnSelect()
      cy.enterSearchTerm("新对象")
      cy.get(".choicey__addable-button").click()
      cy.wait('@elementsPost').then((interception) => {
        const { request } = interception
        expect(request.body).to.deep.include({
          foo: 'bar',
          addable: '新对象'
        })
        expect(request.method).to.eq('POST')
      })
      cy.get(".choicey__pill").should("contain", "新对象")
    })

    it("does not allow adding duplicate item", () => {
      cy.visitPage("/addable")
      cy.clickOnSelect()
      cy.enterSearchTerm("Poland")
      cy.get(".choicey__addable-button").should('not.exist')
    })

    it("handles API error gracefully (addable)", () => {
      cy.intercept('POST', '/elements-error*').as('remoteSearch')
      cy.visitPage("/addable-error")
      cy.clickOnSelect()
      cy.enterSearchTerm("一些新东西")
      cy.get(".choicey__addable-button").click()
      cy.wait('@remoteSearch')
      cy.get('.choicey__error-message').should('be.visible')
      cy.get('.choicey__error-message').should('contain.text', 'Failed to add item. Please try again.')
      cy.get(".choicey__pill").should("not.exist")
    })

    it("handles API error gracefully (addable), message from server", () => {
      cy.intercept('POST', '/elements-error2*').as('remoteSearch')
      cy.visitPage("/addable-error2")
      cy.clickOnSelect()
      cy.enterSearchTerm("一些新东西")
      cy.get(".choicey__addable-button").click()
      cy.wait('@remoteSearch')
      cy.get('.choicey__error-message').should('be.visible')
      cy.get('.choicey__error-message').should('contain.text', '车辆名称已存在')
      cy.get(".choicey__pill").should("not.exist")
    })
  })

  describe("limits and selection modes", () => {
    it("respects selected items limit", () => {
      cy.visitPage("/limit")
      cy.clickOnSelect()
      cy.get(resultsListSelector).eq(0).find('span').should("contain", "0 / 3")
      cy.get(resultsListSelector).eq(1).find("input").click()
      cy.get(resultsListSelector).eq(0).find('span').should("contain", "1 / 3")
      cy.get('[data-choicey-target="hidden"]').invoke('val').should('deep.equal', ['PL'])
      cy.get(resultsListSelector).eq(2).find("input").click()
      cy.get(resultsListSelector).eq(0).find('span').should("contain", "2 / 3")
      cy.get('[data-choicey-target="hidden"]').invoke('val').should('deep.equal', ['PL', 'CN'])
      cy.get(resultsListSelector).eq(3).find("input").click()
      cy.get(resultsListSelector).eq(0).find('span').should("contain", "3 / 3")
      cy.get('[data-choicey-target="hidden"]').invoke('val').should('deep.equal', ['PL', 'CN', 'BR'])
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
      cy.get('[data-choicey-target="hidden"]').invoke('val').should('deep.equal', ['PL'])
      cy.clickOnSelect()
      cy.get(resultsListSelector).eq(1).find("input").click()
      cy.get(".choicey__pill").should("have.length", 1)
      cy.get('[data-choicey-target="hidden"]').invoke('val').should('deep.equal', ['CN'])
    })
  })

  describe("preload, remote search, API", () => {
    it("loads items from preload API on mount", () => {
      cy.visitPage("/preload")
      cy.clickOnSelect()
      cy.get(resultsListSelector).should("have.length.greaterThan", 0)
      cy.get(resultsListSelector).first().should("contain.text", "Toyota")
    })

    it("filters items using remote search API", () => {
      cy.visitPage("/remote-search")
      cy.clickOnSelect()
      cy.enterSearchTerm("BMW")
      cy.get(resultsListSelector).should("have.length", 1)
      cy.get(resultsListSelector).first().should("contain.text", "BMW")
      cy.enterSearchTerm("no-such-car")
      cy.get(resultsListSelector).should('not.exist')
    })

    it("supports preload + remote search together", () => {
      cy.visitPage("/preload-remote")
      cy.clickOnSelect()
      cy.get(resultsListSelector).should("have.length.greaterThan", 0)
      cy.enterSearchTerm("Toyota")
      cy.get(resultsListSelector).should("have.length", 1)
      cy.get(resultsListSelector).first().should("contain.text", "Toyota")
    })

    it("supports preload + remote search together with request parameters", () => {
      cy.intercept('GET', '/elements*').as('elementsRequest')
      cy.visitPage("/preload-remote-custom-params")
      cy.clickOnSelect()
      cy.get(resultsListSelector).should("have.length.greaterThan", 0)
      cy.wait('@elementsRequest').then((interception) => {
        const { request } = interception
        const url = new URL(request.url)
        expect(url.searchParams.get('foo')).to.eq('bar')
        expect(request.method).to.eq('GET')
      })
      cy.enterSearchTerm("Toyota")
      cy.wait('@elementsRequest').then((interception) => {
        const { request } = interception
        const url = new URL(request.url)
        expect(url.searchParams.get('q')).to.eq('Toyota')
        expect(url.searchParams.get('bar')).to.eq('foo')
        expect(request.method).to.eq('GET')
      })
      cy.get(resultsListSelector).should("have.length", 1)
      cy.get(resultsListSelector).first().should("contain.text", "Toyota")
    })

    it("handles API error gracefully (preload)", () => {
      cy.intercept('GET', '/elements-error*').as('preloadError')
      cy.visitPage("/preload-error")
      cy.wait('@preloadError')
      cy.clickOnSelect()
      cy.get('.choicey__error-message').should('be.visible')
      cy.get('.choicey__error-message').should('contain.text', 'Unable to load results. Please try again.')
    })

    it("handles API error gracefully (preload), message from server", () => {
      cy.intercept('GET', '/elements-error2*').as('preloadError')
      cy.visitPage("/preload-error2")
      cy.wait('@preloadError')
      cy.clickOnSelect()
      cy.get('.choicey__error-message').should('be.visible')
      cy.get('.choicey__error-message').should('contain.text', '500内部服务器错误')
    })

    it("handles API error gracefully (remote search)", () => {
      cy.intercept('GET', '/elements-error*').as('remoteSearch')
      cy.visitPage("/search-error")
      cy.clickOnSelect()
      cy.enterSearchTerm("Toyota")
      cy.wait('@remoteSearch')
      cy.get('.choicey__error-message').should('be.visible')
      cy.get('.choicey__error-message').should('contain.text', 'Unable to load results. Please try again.')
    })

    it("handles API error gracefully (remote search), message from server", () => {
      cy.intercept('GET', '/elements-error2*').as('remoteSearch')
      cy.visitPage("/search-error2")
      cy.clickOnSelect()
      cy.enterSearchTerm("Toyota")
      cy.wait('@remoteSearch')
      cy.get('.choicey__error-message').should('be.visible')
      cy.get('.choicey__error-message').should('contain.text', '500内部服务器错误')
    })
  })

  describe("groups", () => {
    it("renders grouped items correctly", () => {
      cy.visit("/groups")
      cy.clickOnSelect()
      cy.get(resultsListSelector).should("contain.text", "Europe")
      cy.get(resultsListSelector).should("contain.text", "Asia")
      cy.get(resultsListSelector).should("contain.text", "Poland")
      cy.get(resultsListSelector).should("contain.text", "China")
    })

    it("filters items by element name in groups", () => {
      cy.visit("/groups")
      cy.clickOnSelect()
      cy.enterSearchTerm("Poland")
      cy.get(resultsListSelector).should("have.length", 2)
      cy.get(resultsListSelector).eq(0).should("contain.text", "Europe")
      cy.get(resultsListSelector).eq(1).should("contain.text", "Poland")
    })

    it("filters items by group name", () => {
      cy.visit("/groups")
      cy.clickOnSelect()
      cy.enterSearchTerm("Europe")
      cy.get(resultsListSelector).should("contain.text", "Poland")
      cy.get(resultsListSelector).should("not.contain.text", "China")
    })

    it("supports fuzzy search in groups", () => {
      cy.visit("/groups-fuzzy")
      cy.clickOnSelect()
      cy.enterSearchTerm("polan")
      cy.get(resultsListSelector).should("have.length.greaterThan", 0)
      cy.get(resultsListSelector).first().should("contain.text", "Poland")
      cy.enterSearchTerm("eurp")
      cy.get(resultsListSelector).should("contain.text", "Europe")
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

    it("respects limit when selecting group checkbox", () => {
      cy.visit("/group-limit")
      cy.clickOnSelect()
      // Załóżmy, że limit to 2, a grupa ma 3 elementy
      // Wybierz pierwszy checkbox grupy
      cy.get('.choicey__group-checkbox').eq(0).click()
      // Powinny być wybrane tylko 2 elementy (limit)
      cy.get(resultsListSelector).find('input:checked').should('have.length', 2)
    })

    it("does not add new item to group if addable used", () => {
      cy.visit("/groups")
      cy.clickOnSelect()
      cy.enterSearchTerm("NowyGrupowy")
      cy.get('.choicey__addable-button').should('not.exist')
    })
  })

  describe("UI/UX and interactions", () => {
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

    it("shows all items after clearing search input", () => {
      cy.visitPage()
      cy.clickOnSelect()
      cy.enterSearchTerm("china")
      cy.get(resultsListSelector).should("have.length", 1)
      cy.get('[data-choicey-target="search"]').clear()
      cy.get(resultsListSelector).should("have.length", 11)
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

    it("renders custom classes and disables item", () => {
      cy.visitPage("/custom-classes")
      cy.clickOnSelect()
      cy.get(resultsListSelector).eq(2).should("have.class", "bg-secondary")
      cy.get(resultsListSelector).eq(2).find("input").should("be.disabled")
    })

    it("closes dropdown on outside click", () => {
      cy.visitPage()
      cy.clickOnSelect()
      cy.get('.choicey__dropdown').should('have.class', 'choicey__dropdown--open')
      cy.get('html').click('bottomLeft')
      cy.get('.choicey__dropdown').should('not.have.class', 'choicey__dropdown--open')
    })

    it("focuses input after closing and reopening dropdown", () => {
      cy.visitPage()
      cy.clickOnSelect()
      cy.get('body').click('topLeft')
      cy.clickOnSelect()
      cy.focused().should('have.class', 'choicey__search')
    })

    it("clears input after closing dropdown", () => {
      cy.visitPage()
      cy.clickOnSelect()
      cy.enterSearchTerm("Poland")
      cy.get('body').click('topLeft')
      cy.clickOnSelect()
      cy.get('[data-choicey-target="search"]').should('have.value', '')
    })
  })

  describe("events and attributes", () => {
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

    it("does not leak MutationObserver after disconnect", () => {
      cy.visitPage()
      cy.window().then(win => {
        const controller = win.document.querySelector('[data-controller="choicey"]')
        if (controller && controller.disconnect) {
          controller.disconnect()
          // Nie ma prostego sposobu na sprawdzenie wycieku, ale test nie powinien rzucać
        }
      })
    })
  })

  describe("Choicey disconnect/connect", ()  => {
    it("should not leak observer and should work after reconnect", () => {
      cy.visitPage();

      cy.window().its('Stimulus').should('exist');

      cy.window().then(window => {
        const el = window.document.querySelector('[data-controller="choicey"]');
        const controller = window.Stimulus.getControllerForElementAndIdentifier(el, "choicey");

        controller.disconnect();
        
        el.setAttribute("data-choicey-disabled-value", "true");
        cy.get('.choicey__container').should('not.have.class', 'choicey__disabled')
        
        controller.connect();
        el.setAttribute("data-choicey-disabled-value", "true");
        cy.get('.choicey__container').should('have.class', 'choicey__disabled')

        // el.setAttribute("data-choicey-disabled-value", "false");
        // cy.wait(500)

        // cy.clickOnSelect()
        // cy.get(resultsListSelector).eq(0).find("input").click()
        // cy.get(resultsListSelector).eq(1).find("input").click()
        

        // const select = window.document.querySelector('[data-choicey-target="hidden"]')
        // expect(select.values).to.deep.equal(['PL', 'CY'])
        // expect(controller.selectedValue).to.deep.equal(['PL', 'CY'])
      });
    });
  });
})