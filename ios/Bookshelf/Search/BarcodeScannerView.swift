import SwiftUI
import VisionKit

/// Сканер штрихкода на обложке. Находит книгу по ISBN (у нас или в Open Library) и открывает её.
/// Где камера недоступна (симулятор, старые iPhone), остаётся ручной ввод ISBN.
struct BarcodeScannerView: View {
    let onFound: (Book) -> Void
    let onNotFound: () -> Void

    @Environment(AuthStore.self) private var auth
    @Environment(\.dismiss) private var dismiss
    @State private var manualISBN = ""
    @State private var isLookingUp = false
    @State private var hint = L("Наведите камеру на штрихкод на обороте книги")
    @State private var notFound = false

    private var scannerAvailable: Bool {
        DataScannerViewController.isSupported && DataScannerViewController.isAvailable
    }

    var body: some View {
        NavigationStack {
            VStack(spacing: 16) {
                if scannerAvailable {
                    ScannerRepresentable { payload in
                        Task { await lookUp(payload) }
                    }
                    .clipShape(RoundedRectangle(cornerRadius: 16))
                    .overlay {
                        if isLookingUp { ProgressView().controlSize(.large) }
                    }
                } else {
                    ContentUnavailableView(
                        "Камера недоступна",
                        systemImage: "barcode.viewfinder",
                        description: Text("Введите ISBN с обложки вручную")
                    )
                }

                Text(hint)
                    .font(.footnote)
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)

                HStack {
                    TextField("ISBN, например 978-5-389-01686-6", text: $manualISBN)
                        .keyboardType(.numbersAndPunctuation)
                        .textFieldStyle(.roundedBorder)
                        .submitLabel(.search)
                        .onSubmit { Task { await lookUp(manualISBN) } }
                    Button("Найти") { Task { await lookUp(manualISBN) } }
                        .disabled(manualISBN.isEmpty || isLookingUp)
                }
            }
            .padding()
            .navigationTitle("Сканировать ISBN")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Закрыть") { dismiss() }
                }
            }
            .alert("Книга не найдена", isPresented: $notFound) {
                Button("Добавить вручную") { onNotFound() }
                Button("Сканировать ещё", role: .cancel) {}
            } message: {
                Text("Такого ISBN нет ни у нас, ни в Open Library.")
            }
        }
    }

    private func lookUp(_ raw: String) async {
        guard !isLookingUp else { return }
        // Обычные товарные штрихкоды (не 978/979) отсеиваем сразу, без запроса к серверу.
        guard let isbn = ISBN.normalize(raw) else {
            hint = L("Это не ISBN книги. Ищите штрихкод, который начинается с 978 или 979.")
            return
        }
        isLookingUp = true
        defer { isLookingUp = false }
        do {
            onFound(try await auth.api.book(isbn: isbn))
        } catch APIError.server {
            notFound = true
        } catch {
            hint = error.localizedDescription
        }
    }
}

private struct ScannerRepresentable: UIViewControllerRepresentable {
    let onScan: (String) -> Void

    func makeUIViewController(context: Context) -> DataScannerViewController {
        let controller = DataScannerViewController(
            recognizedDataTypes: [.barcode(symbologies: [.ean13])],
            qualityLevel: .balanced,
            recognizesMultipleItems: false,
            isHighFrameRateTrackingEnabled: false,
            isHighlightingEnabled: true
        )
        controller.delegate = context.coordinator
        try? controller.startScanning()
        return controller
    }

    func updateUIViewController(_ controller: DataScannerViewController, context: Context) {}

    static func dismantleUIViewController(_ controller: DataScannerViewController, coordinator: Coordinator) {
        controller.stopScanning()
    }

    func makeCoordinator() -> Coordinator {
        Coordinator(onScan: onScan)
    }

    final class Coordinator: NSObject, DataScannerViewControllerDelegate {
        let onScan: (String) -> Void
        private var lastPayload: String?

        init(onScan: @escaping (String) -> Void) {
            self.onScan = onScan
        }

        func dataScanner(_ dataScanner: DataScannerViewController, didAdd addedItems: [RecognizedItem], allItems: [RecognizedItem]) {
            for item in addedItems {
                guard case .barcode(let barcode) = item, let payload = barcode.payloadStringValue else { continue }
                // Один и тот же код камера видит много раз подряд — реагируем на него однажды.
                guard payload != lastPayload else { continue }
                lastPayload = payload
                onScan(payload)
            }
        }
    }
}
