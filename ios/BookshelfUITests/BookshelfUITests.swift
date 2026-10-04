import XCTest

/// Сквозные сценарии на подставном сервере (UITestSupport в приложении): сеть и настоящий сервер не нужны.
/// Тексты интерфейса зависят от языка симулятора, поэтому ищем по идентификаторам и по данным книг.
final class BookshelfUITests: XCTestCase {
    private var app: XCUIApplication!

    override func setUp() {
        continueAfterFailure = false
    }

    private func launch(_ extra: [String] = []) {
        app = XCUIApplication()
        app.launchArguments = ["-ui-testing"] + extra
        app.launch()
    }

    /// Любой элемент с текстом: строка списка с жестами может быть и текстом, и кнопкой.
    private func element(containing text: String) -> XCUIElement {
        app.descendants(matching: .any).matching(NSPredicate(format: "label CONTAINS %@", text)).firstMatch
    }

    /// Прокручивает список, пока элемент не появится (ячейки List создаются только на экране).
    @discardableResult
    private func scrollTo(_ element: XCUIElement, maxSwipes: Int = 8) -> XCUIElement {
        var swipes = 0
        while !element.isHittable && swipes < maxSwipes {
            app.swipeUp()
            swipes += 1
        }
        XCTAssertTrue(element.waitForExistence(timeout: 2), "не нашли \(element)")
        return element
    }

    private func tab(_ index: Int) -> XCUIElement {
        app.tabBars.buttons.element(boundBy: index)
    }

    func testSignInScreenShowsServerError() {
        launch(["-ui-testing-signed-out"])
        let email = app.textFields["signInEmail"]
        XCTAssertTrue(email.waitForExistence(timeout: 10))
        email.tap()
        email.typeText("reader@example.com")
        let password = app.secureTextFields["signInPassword"]
        password.tap()
        password.typeText("wrong-password")
        app.buttons["signInSubmit"].tap()
        XCTAssertTrue(app.alerts.firstMatch.waitForExistence(timeout: 5), "ошибка входа показывается")
    }

    func testOpenBookAndAddQuote() {
        launch()
        let book = element(containing: "Мастер и Маргарита")
        XCTAssertTrue(book.waitForExistence(timeout: 10), "книга на полке")
        book.tap()
        XCTAssertTrue(app.navigationBars.buttons.firstMatch.waitForExistence(timeout: 5), "открылась книга")

        scrollTo(element(containing: "Рукописи не горят"))
        scrollTo(app.buttons["addQuote"]).tap()

        let text = app.textViews["quoteText"]
        XCTAssertTrue(text.waitForExistence(timeout: 5), "открылся редактор цитаты")
        text.tap()
        text.typeText("Never shall I forget")
        app.buttons["saveQuote"].tap()

        XCTAssertTrue(text.waitForNonExistence(timeout: 5), "редактор закрылся после сохранения")
        XCTAssertTrue(scrollTo(element(containing: "Never shall I forget")).exists, "новая цитата в списке")
    }

    func testChallengesAndClubsOpen() {
        launch()
        XCTAssertTrue(tab(3).waitForExistence(timeout: 10))
        tab(3).tap()
        scrollTo(app.buttons["challengesLink"]).tap()
        XCTAssertTrue(app.staticTexts["Осенний марафон"].waitForExistence(timeout: 5), "мой челлендж в списке")

        tab(4).tap()
        scrollTo(app.buttons["clubsLink"]).tap()
        XCTAssertTrue(app.navigationBars.buttons.firstMatch.waitForExistence(timeout: 5), "открылся экран клубов")
        XCTAssertFalse(app.alerts.firstMatch.exists, "без ошибок загрузки")
    }

    func testOfflineBannerWithoutNetwork() {
        launch(["-ui-testing-offline"])
        let banner = app.descendants(matching: .any)["offlineBanner"]
        XCTAssertTrue(banner.waitForExistence(timeout: 10), "полоска «нет сети» видна")
    }
}
