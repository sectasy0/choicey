const resultsListSelector = "[data-choicey-target='list'] li"
const input = "[data-choicey-target='search']"

Cypress.Commands.add("visitPage", (path = "/basic") => {
  cy.visit(path)
})

Cypress.Commands.add("enterSearchTerm", (term) => {
  cy.get(input).type(term)
})

Cypress.Commands.add("clickOnSelect", () => {
  const element = cy.get(".choicey__container")
  element.click()
})
