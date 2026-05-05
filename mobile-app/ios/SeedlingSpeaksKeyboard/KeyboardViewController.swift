import UIKit
import SwiftUI

/// Entry point for the SeedlingSpeaks Custom Keyboard Extension.
/// Hosts a SwiftUI view inside UIKit's UIInputViewController.
class KeyboardViewController: UIInputViewController {

    private var hostingController: UIHostingController<KeyboardView>?

    override func viewDidLoad() {
        super.viewDidLoad()

        let keyboardView = KeyboardView(
            insertText: { [weak self] text in
                self?.textDocumentProxy.insertText(text)
            },
            switchKeyboard: { [weak self] in
                self?.advanceToNextInputMode()
            },
            hasFullAccess: hasFullAccess
        )

        let hc = UIHostingController(rootView: keyboardView)
        hc.view.translatesAutoresizingMaskIntoConstraints = false
        hc.view.backgroundColor = .clear

        addChild(hc)
        view.addSubview(hc.view)
        hc.didMove(toParent: self)

        NSLayoutConstraint.activate([
            hc.view.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            hc.view.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            hc.view.topAnchor.constraint(equalTo: view.topAnchor),
            hc.view.bottomAnchor.constraint(equalTo: view.bottomAnchor),
        ])

        // Request a fixed height for the keyboard
        let heightConstraint = view.heightAnchor.constraint(equalToConstant: 280)
        heightConstraint.priority = .required - 1
        heightConstraint.isActive = true

        hostingController = hc
    }

    /// Checks if the user has granted "Allow Full Access" in Settings.
    private var hasFullAccess: Bool {
        return UIPasteboard.general.hasStrings || isOpenAccessGranted()
    }

    private func isOpenAccessGranted() -> Bool {
        // A reliable way: try to check if we can access the network
        let fm = FileManager.default
        let containerURL = fm.containerURL(forSecurityApplicationGroupIdentifier: "group.com.seedlinglabs.speaks")
        // If we can write to pasteboard, full access is likely granted
        UIPasteboard.general.string = ""
        return UIPasteboard.general.string != nil
    }
}
