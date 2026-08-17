#compdef make gmake
#
# Tab completion for this repo's Make targets — zsh.
#
# Why this exists: the root Makefile pulls every target in with
#
#     include $(wildcard make/*.mk)
#
# and zsh's builtin `_make` expands only plain $(VAR) references when it follows
# an `include` line. `$(wildcard …)` never resolves, so out of the box
# `make <TAB>` offers exactly one target — `help` — and hides the rest.
#
# Reading the fragments directly fixes that and comes with a bonus: every rule
# already carries a `## description` for `make help`, so completion can show it.
#
# Install:
#     make completion >> ~/.zshrc   # after `compinit`
#     exec zsh
#
# Completion in any other directory is untouched: anything that does not look
# like this layout is handed straight back to zsh's own `_make`.

# Print the project root when $1 (default $PWD) sits inside a fragment layout;
# return non-zero and print nothing otherwise — declining is what sends an
# unrelated repo back to the shell's own `_make`.
_make_fragment_root() {
  local root=${1:-$PWD}
  while [[ ! -f $root/Makefile && $root != / ]]; do
    root=${root:h}
  done

  local -a fragments
  fragments=($root/make/*.mk(N))
  [[ -f $root/Makefile ]] && (( ${#fragments} )) || return 1
  print -r -- $root
}

# Emit `target:description` for every documented rule under $1, one per line.
# Kept separate from the widget so it can be exercised without a completion
# context (see the completion tests).
_make_fragment_harvest() {
  local root=${1:-$PWD}
  local -a fragments
  fragments=($root/Makefile(N) $root/make/*.mk(N))
  (( ${#fragments} )) || return 1

  command grep -hE '^[a-zA-Z0-9_.-][a-zA-Z0-9_ .-]*:.*##' -- $fragments 2>/dev/null |
    awk '{
      desc = $0; sub(/^[^:]*:[^#]*## */, "", desc)
      names = $0; sub(/:.*/, "", names)
      n = split(names, t, " ")
      for (i = 1; i <= n; i++) print t[i] ":" desc
    }' |
    sort -u
}

_make_fragment_targets() {
  setopt localoptions extendedglob

  # `make -C dir` / `-f file` point somewhere else entirely; not our business.
  if (( ${words[(I)(-C|--directory|-f|--file|--makefile)]} )); then
    _make "$@"
    return
  fi

  # No fragment layout here — some other project's Makefile.
  local root=$(_make_fragment_root $PWD)
  if [[ -z $root ]]; then
    _make "$@"
    return
  fi

  local -a targets
  targets=(${(f)"$(_make_fragment_harvest $root)"})
  (( ${#targets} )) || { _make "$@"; return }

  _describe -t targets 'make target' targets
}

# Sourced from ~/.zshrc before `compinit`, `compdef` would not exist yet.
if (( ! ${+functions[compdef]} )); then
  autoload -Uz compinit && compinit -C
fi
compdef _make_fragment_targets make gmake
