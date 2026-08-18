import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { AdminUserSummary } from "@/lib/users/usersQuery";
import { UsersTable } from "./UsersTable";

const user = (over: Partial<AdminUserSummary> = {}): AdminUserSummary => ({
  id: "1",
  email: "root@example.com",
  displayName: "Root",
  role: "admin",
  status: "active",
  city: null,
  country: null,
  photoUrl: null,
  createdAt: "2026-03-12T10:00:00.000Z",
  ...over,
});

describe("UsersTable", () => {
  it("renders a row per user with the role and status spelled out", () => {
    render(
      <UsersTable
        users={[
          user(),
          user({
            id: "2",
            displayName: "Ana",
            role: "user",
            status: "pending",
          }),
        ]}
        isLoading={false}
        isFiltered={false}
      />,
    );

    expect(screen.getAllByRole("row")).toHaveLength(3); // header + 2
    expect(screen.getByText("Root")).toBeInTheDocument();
    expect(screen.getByText("Ana")).toBeInTheDocument();
    // Colour is never the only carrier of meaning.
    expect(screen.getByText("Admin")).toBeInTheDocument();
    expect(screen.getByText("Pending")).toBeInTheDocument();
  });

  it("distinguishes an empty directory from an empty result set", () => {
    const { rerender } = render(
      <UsersTable users={[]} isLoading={false} isFiltered={false} />,
    );
    expect(screen.getByText("No users yet.")).toBeInTheDocument();

    rerender(<UsersTable users={[]} isLoading={false} isFiltered />);
    expect(
      screen.getByText("No users match these filters."),
    ).toBeInTheDocument();
  });

  it("shows a loading state instead of an empty one on the first load", () => {
    render(<UsersTable users={[]} isLoading isFiltered={false} />);
    expect(screen.getByText("Loading users…")).toBeInTheDocument();
    expect(screen.queryByText("No users yet.")).not.toBeInTheDocument();
  });
});
