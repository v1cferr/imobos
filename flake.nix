{
  description = "ImobOS: reproducible development and tooling environment";

  # Stable channel: the toolchain moves when flake.lock is bumped on purpose, never by surprise.
  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixos-26.05";

  outputs =
    { nixpkgs, ... }:
    let
      systems = [
        "x86_64-linux"
        "aarch64-linux"
        "x86_64-darwin"
        "aarch64-darwin"
      ];
      forAllSystems = f: nixpkgs.lib.genAttrs systems (system: f nixpkgs.legacyPackages.${system});

      # Only the client binaries. Listing postgresql_17 itself makes mkShell pull its `dev` output,
      # which drags clang + LLVM (the server's JIT) into a shell that only ever runs psql.
      postgresClient =
        pkgs:
        pkgs.runCommand "postgresql-client-${pkgs.postgresql_17.version}" { } ''
          mkdir -p $out/bin
          for b in psql pg_dump pg_restore pg_isready; do
            ln -s ${pkgs.postgresql_17}/bin/$b $out/bin/$b
          done
        '';
    in
    {
      devShells = forAllSystems (pkgs: {
        default = pkgs.mkShell {
          packages = [
            # JavaScript / TypeScript
            pkgs.nodejs_24 # active LTS
            pkgs.pnpm

            # Python (API)
            pkgs.python313
            pkgs.uv

            # Service clients: talk to the containers, never run them (Docker Compose does)
            (postgresClient pkgs) # psql, pg_dump, pg_restore, pg_isready
            pkgs.redis # redis-cli

            pkgs.git
            pkgs.markdownlint-cli2 # docs lint, part of `pnpm lint`
          ];

          # uv must use the flake's interpreter, never download its own: one pinned Python everywhere.
          env = {
            UV_PYTHON = "${pkgs.python313}/bin/python3";
            UV_PYTHON_DOWNLOADS = "never";
            NEXT_TELEMETRY_DISABLED = "1";
          };
        };
      });

      formatter = forAllSystems (pkgs: pkgs.nixfmt);
    };
}
