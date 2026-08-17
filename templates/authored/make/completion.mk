# completion targets.
#
# `include $(wildcard make/*.mk)` in the root Makefile defeats zsh's builtin
# make completion — it expands only plain $(VAR) references when following an
# include, so every target defined in a fragment is invisible and `make <TAB>`
# offers just `help`. scripts/completion/ ships a replacement that reads the
# fragments directly, descriptions included.
.PHONY: completion

COMPLETION_DIR := $(CURDIR)/scripts/completion

completion: ## Print the shell snippet enabling `make <TAB>` (>> ~/.zshrc)
	@shell="$${SHELL##*/}"; \
	case "$$shell" in \
	  zsh)  script="$(COMPLETION_DIR)/make.zsh" ;; \
	  bash) script="$(COMPLETION_DIR)/make.bash" ;; \
	  *) echo "make completion: unsupported shell '$$shell' — zsh and bash only" >&2; exit 1 ;; \
	esac; \
	[ -f "$$script" ] || { echo "make completion: $$script is missing" >&2; exit 1; }; \
	printf '\n# __PROJECT_NAME__ — make target completion\n'; \
	printf '[ -f %s ] && source %s\n' "$$script" "$$script"
