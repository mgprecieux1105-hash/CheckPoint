import { describe, expect, it } from "vitest";
import { matchProject, parseQuickAdd } from "./quick-add";

describe("quick add parser", () => {
  it("extracts category, project and priority", () => {
    expect(parseQuickAdd("Réviser chapitre 3 #Études @Université !!")).toEqual({
      title: "Réviser chapitre 3", category: "Études", projectQuery: "Université", priority: "high",
    });
  });
  it("keeps plain titles intact", () => {
    expect(parseQuickAdd("  Appeler le client  ")).toEqual({ title: "Appeler le client", category: null, projectQuery: null, priority: null });
  });
  it("supports !!! and !low", () => {
    expect(parseQuickAdd("Urgent !!!").priority).toBe("urgent");
    expect(parseQuickAdd("Plus tard !low").priority).toBe("low");
  });
  it("matches projects without accents or case", () => {
    const projects = [{ id: "1", name: "Université" }, { id: "2", name: "Lancement Business" }];
    expect(matchProject(projects, "universite")?.id).toBe("1");
    expect(matchProject(projects, "lancement-bus")?.id).toBe("2");
    expect(matchProject(projects, "sport")).toBeNull();
  });
});
