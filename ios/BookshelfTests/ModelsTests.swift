import XCTest
@testable import Bookshelf

/// Проверяем, что модели читают реальные ответы сервера (примеры сняты с /api/v1).
final class ModelsTests: XCTestCase {
    private func decode<T: Decodable>(_ type: T.Type, _ json: String) throws -> T {
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .custom { try DateCoding.decode($0) }
        return try decoder.decode(T.self, from: Data(json.utf8))
    }

    func testDecodesBookDetails() throws {
        let json = """
        {"book":{"id":"b1","title":"Дюна","author":"Фрэнк Герберт","year":1965,"isbn":null,"coverUrl":null},
         "myEntry":{"status":"READ","startedAt":"2026-09-01T00:00:00.000Z","finishedAt":"2026-10-01T10:00:00.000Z",
                    "rating":8,"review":"Песок!","isPublic":true,"updatedAt":"2026-10-03T11:16:54.534Z"},
         "stats":{"avgRating":8,"ratingsCount":1,"readersCount":1},
         "reviews":[{"id":"r1","userId":"u1","userName":"Аня","rating":null,"review":"Хорошо","updatedAt":"2026-10-03T11:16:54Z"}]}
        """
        let details = try decode(BookDetails.self, json)
        XCTAssertEqual(details.book.subtitle, "Фрэнк Герберт · 1965")
        XCTAssertEqual(details.myEntry?.status, .read)
        XCTAssertEqual(details.myEntry?.rating, 8)
        XCTAssertEqual(details.myEntry.flatMap(\.startedAt).map(DateCoding.dayString), "2026-09-01")
        XCTAssertEqual(details.stats.avgRating, 8)
        XCTAssertEqual(details.reviews.first?.userName, "Аня")
    }

    func testDecodesShelfAndSearch() throws {
        let shelf = try decode(Shelf.self, """
        {"counts":{"WANT":0,"READING":2,"PAUSED":0,"READ":1,"DROPPED":0},
         "items":[{"book":{"id":"b1","title":"T","author":"A","year":null,"isbn":null,
                           "coverUrl":"https://covers.openlibrary.org/b/id/1-M.jpg"},
                   "entry":{"status":"READING","startedAt":null,"finishedAt":null,"rating":null,"review":null,
                            "isPublic":true,"updatedAt":"2026-10-03T11:16:54.534Z"}}]}
        """)
        XCTAssertEqual(shelf.count(.reading), 2)
        XCTAssertEqual(shelf.items.first?.book.coverUrl?.host, "covers.openlibrary.org")
        XCTAssertEqual(shelf.items.first?.book.subtitle, "A")

        let search = try decode(SearchResults.self, """
        {"local":[],"openLibrary":[{"key":"/works/OL1W","title":"Dune","author":"Frank Herbert","year":1965,
                                    "isbn":"0441013597","coverUrl":null}]}
        """)
        XCTAssertEqual(search.openLibrary.first?.id, "/works/OL1W")
    }

    func testActionsForEachStatus() {
        XCTAssertEqual(ReadingStatus.actions(for: nil).first?.target, .reading)
        XCTAssertEqual(ReadingStatus.actions(for: .reading).map(\.target), [.read, .paused, .dropped])
        XCTAssertEqual(ReadingStatus.actions(for: .read).map(\.title), ["Перечитать"])
        for status in ReadingStatus.allCases {
            XCTAssertFalse(ReadingStatus.actions(for: status).contains { $0.target == status })
        }
    }

    func testReviewUpdateEncodesDayStrings() throws {
        let date = try XCTUnwrap(ISO8601DateFormatter().date(from: "2026-10-01T23:30:00Z"))
        let update = ReviewUpdate(rating: 9, review: nil, isPublic: false, startedAt: nil, finishedAt: DateCoding.dayString(date))
        let object = try JSONSerialization.jsonObject(with: JSONEncoder().encode(update)) as? [String: Any]
        XCTAssertEqual(object?["finishedAt"] as? String, "2026-10-01")
        XCTAssertEqual(object?["rating"] as? Int, 9)
        XCTAssertEqual(object?["isPublic"] as? Bool, false)
    }

    func testRussianPlural() {
        XCTAssertEqual(Plural.ru(1, "оценка", "оценки", "оценок"), "оценка")
        XCTAssertEqual(Plural.ru(3, "оценка", "оценки", "оценок"), "оценки")
        XCTAssertEqual(Plural.ru(11, "оценка", "оценки", "оценок"), "оценок")
        XCTAssertEqual(Plural.ru(21, "оценка", "оценки", "оценок"), "оценка")
        XCTAssertEqual(Plural.ru(0, "оценка", "оценки", "оценок"), "оценок")
    }

    func testISBN() {
        XCTAssertEqual(ISBN.normalize("9780441013593"), "9780441013593")
        XCTAssertEqual(ISBN.normalize("978-0-441-01359-3"), "9780441013593")
        XCTAssertEqual(ISBN.normalize("0441013597"), "9780441013593")
        XCTAssertEqual(ISBN.normalize("080442957X"), "9780804429573")
        XCTAssertNil(ISBN.normalize("9780441013594"), "неверная контрольная цифра")
        XCTAssertNil(ISBN.normalize("4600000000001"), "EAN-13 товара — не книга")
    }

    func testDecodesFeedAndProfile() throws {
        let feed = try decode(Feed.self, """
        {"followingCount":1,"nextCursor":null,"items":[
          {"id":"a1","type":"REVIEW","status":null,"rating":9,"review":"Великолепно","createdAt":"2026-10-03T12:00:00.000Z",
           "user":{"id":"u1","name":"Аня"},"book":{"id":"b1","title":"Дюна","author":"Фрэнк Герберт","year":1965,"isbn":null,"coverUrl":null}},
          {"id":"a2","type":"STATUS","status":"READ","rating":null,"review":null,"createdAt":"2026-10-03T11:00:00.000Z",
           "user":{"id":"u1","name":"Аня"},"book":{"id":"b1","title":"Дюна","author":"Фрэнк Герберт","year":1965,"isbn":null,"coverUrl":null}}]}
        """)
        XCTAssertEqual(feed.items.map(\.label), ["отзыв", "прочитано"])

        let profile = try decode(UserProfile.self, """
        {"user":{"id":"u1","name":"Аня"},"isMe":false,"isFollowing":true,"counts":{"followers":1,"following":0,"read":1},
         "readingNow":[],"recentlyRead":[{"book":{"id":"b1","title":"Дюна","author":"Фрэнк Герберт","year":1965,"isbn":null,"coverUrl":null},
         "rating":9,"finishedAt":"2026-10-03T12:00:00.000Z"}],
         "lists":[{"id":"l1","title":"Фантастика","description":null,"isPublic":true,"count":1}]}
        """)
        XCTAssertTrue(profile.isFollowing)
        XCTAssertEqual(profile.recentlyRead.first?.rating, 9)
        XCTAssertEqual(profile.lists.first?.count, 1)

        let lists = try decode([MyList].self, """
        [{"id":"l1","title":"Ф","description":"Лучшее","isPublic":false,"count":2,
          "covers":["https://covers.openlibrary.org/b/id/1-M.jpg"],"containsBook":true}]
        """)
        XCTAssertEqual(lists.first?.containsBook, true)
    }
}
