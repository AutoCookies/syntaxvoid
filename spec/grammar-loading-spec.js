describe("Grammar and Style Loading Smoke Test", () => {
  beforeEach(async () => {
    // Packages must be loaded and activated to verify their grammars and styles
    await atom.packages.activatePackage("language-hyperlink");
    await atom.packages.activatePackage("language-todo");
    await atom.packages.activatePackage("syntaxvoid-ui-kit");
    await atom.packages.activatePackage("syntaxvoid-risk-overlay");
    await atom.packages.activatePackage("syntaxvoid-terminal");
  });

  it("loads language-hyperlink grammar without errors", () => {
    const grammar = atom.grammars.grammarForScopeName("source.hyperlink");
    expect(grammar).toBeDefined();
  });

  it("loads language-todo grammar without errors", () => {
    const grammar = atom.grammars.grammarForScopeName("text.todo");
    expect(grammar).toBeDefined();
  });

  it("loads syntaxvoid-risk-overlay styles without errors", () => {
    const pkg = atom.packages.getLoadedPackage("syntaxvoid-risk-overlay");
    expect(pkg).toBeDefined();
    const notifications = atom.notifications.getNotifications();
    const lessErrors = notifications.filter(n => n.getMessage().includes("LessError"));
    expect(lessErrors.length).toBe(0);
  });

  it("loads syntaxvoid-terminal styles without errors", () => {
    const pkg = atom.packages.getLoadedPackage("syntaxvoid-terminal");
    expect(pkg).toBeDefined();
    const notifications = atom.notifications.getNotifications();
    const lessErrors = notifications.filter(n => n.getMessage().includes("LessError"));
    expect(lessErrors.length).toBe(0);
  });
});
