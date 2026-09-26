import ExpoModulesCore
import UIKit
import WebKit

// Puts the quiz board on an AirPlay screen-mirroring display, so the television shows the board rather than the phone.
public final class ExternalScreenModule: Module {
  private var address: URL?
  private var loaded: URL?
  private var window: UIWindow?
  private var observers: [NSObjectProtocol] = []

  public func definition() -> ModuleDefinition {
    Name("ExternalScreen")

    Events("onChange")

    AsyncFunction("isConnected") { () -> Bool in
      return self.externalScreen() != nil
    }.runOnQueue(.main)

    // Remembered until a display turns up, and kept after one goes, so a mirror that drops mid-quiz gets its board back.
    AsyncFunction("show") { (url: String) in
      self.address = URL(string: url)
      self.attach()
    }.runOnQueue(.main)

    OnCreate {
      DispatchQueue.main.async { self.observe() }
    }

    OnDestroy {
      DispatchQueue.main.async {
        self.observers.forEach { NotificationCenter.default.removeObserver($0) }
        self.observers.removeAll()
        self.detach()
      }
    }
  }

  // The app runs without scenes, so an external display arrives as a plain UIScreen.
  private func observe() {
    let center = NotificationCenter.default

    observers.append(center.addObserver(forName: UIScreen.didConnectNotification, object: nil, queue: .main) { [weak self] _ in
      self?.attach()
      self?.sendEvent("onChange", ["connected": true])
    })

    observers.append(center.addObserver(forName: UIScreen.didDisconnectNotification, object: nil, queue: .main) { [weak self] _ in
      self?.detach()
      self?.sendEvent("onChange", ["connected": self?.externalScreen() != nil])
    })
  }

  private func externalScreen() -> UIScreen? {
    return UIScreen.screens.first { $0 !== UIScreen.main }
  }

  private func attach() {
    guard let address, let screen = externalScreen() else { return }

    if let window, window.screen === screen, let web = window.rootViewController?.view as? WKWebView {
      // The page redirects away from the address it was given, and loading it again would lose the round in progress.
      if loaded != address {
        loaded = address
        web.load(URLRequest(url: address))
      }
      return
    }

    detach()

    if let mode = screen.preferredMode {
      screen.currentMode = mode
    }

    let web = WKWebView(frame: screen.bounds)
    web.isOpaque = false
    web.backgroundColor = .black
    web.scrollView.isScrollEnabled = false
    web.scrollView.contentInsetAdjustmentBehavior = .never

    let controller = UIViewController()
    controller.view = web

    let window = UIWindow(frame: screen.bounds)
    window.screen = screen
    window.backgroundColor = .black
    window.rootViewController = controller
    window.isHidden = false

    self.window = window
    loaded = address
    web.load(URLRequest(url: address))
  }

  private func detach() {
    window?.isHidden = true
    window = nil
    loaded = nil
  }
}
