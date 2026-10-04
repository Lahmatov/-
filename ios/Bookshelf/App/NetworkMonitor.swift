import Foundation
#if canImport(Network)
import Network
#endif

/// Сообщает, когда снова появилась сеть, — чтобы отправить изменения, сделанные офлайн.
@MainActor
final class NetworkMonitor {
    static let shared = NetworkMonitor()

    private var onReconnect: (@MainActor () -> Void)?
    private var wasSatisfied = true
    #if canImport(Network)
    private var monitor: NWPathMonitor?
    #endif

    func start(onReconnect: @escaping @MainActor () -> Void) async {
        self.onReconnect = onReconnect
        #if canImport(Network)
        guard monitor == nil else { return }
        let monitor = NWPathMonitor()
        self.monitor = monitor
        monitor.pathUpdateHandler = { [weak self] path in
            let satisfied = path.status == .satisfied
            Task { @MainActor in self?.update(satisfied: satisfied) }
        }
        monitor.start(queue: DispatchQueue(label: "NetworkMonitor"))
        #endif
    }

    private func update(satisfied: Bool) {
        if satisfied && !wasSatisfied { onReconnect?() }
        wasSatisfied = satisfied
    }
}
