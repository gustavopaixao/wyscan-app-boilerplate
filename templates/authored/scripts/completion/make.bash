# Tab completion for this repo's Make targets — bash.
#
# The bash-completion package already reads make's own database, so it copes
# with `include $(wildcard make/*.mk)`. This is still worth sourcing: it needs
# no bash-completion install, it never executes the `$(shell …)` lines in
# Makefile.head, and it offers only the documented targets rather than every
# rule in the database.
#
# Install:
#     make completion >> ~/.bashrc
#     exec bash
#
# Any directory that does not look like this layout falls through to whatever
# make completion was already installed.

# Print every documented target under $1, space separated.
_make_fragment_harvest_bash() {
  local root=${1:-$PWD}
  local -a fragments=()
  [[ -f $root/Makefile ]] && fragments+=("$root/Makefile")
  local f
  for f in "$root"/make/*.mk; do
    [[ -f $f ]] && fragments+=("$f")
  done
  (( ${#fragments[@]} )) || return 1

  command grep -hE '^[a-zA-Z0-9_.-][a-zA-Z0-9_ .-]*:.*##' -- "${fragments[@]}" 2>/dev/null |
    awk '{ names = $0; sub(/:.*/, "", names); print names }' |
    tr ' ' '\n' |
    sort -u
}

_make_fragment_targets() {
  local root=$PWD
  while [[ ! -f $root/Makefile && $root != / ]]; do
    root=${root%/*}
    [[ -z $root ]] && root=/
  done

  local -a here=()
  local f
  for f in "$root"/make/*.mk; do
    [[ -f $f ]] && here+=("$f")
  done

  if [[ ! -f $root/Makefile ]] || (( ! ${#here[@]} )); then
    # Hand back to bash-completion's own make handler when it is installed,
    # otherwise fall back to filenames.
    if declare -F _make >/dev/null 2>&1; then
      _make "$@"
    else
      compopt -o default 2>/dev/null
      COMPREPLY=()
    fi
    return
  fi

  local cur=${COMP_WORDS[COMP_CWORD]}
  local targets
  targets=$(_make_fragment_harvest_bash "$root")
  COMPREPLY=($(compgen -W "$targets" -- "$cur"))
}

complete -F _make_fragment_targets make gmake
