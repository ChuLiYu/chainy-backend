#!/bin/bash

# 修改提交訊息的腳本
git filter-branch -f --msg-filter '
case $GIT_COMMIT in
    6230978*)
        echo "docs: add secure deployment plan"
        ;;
    81beca6*)
        echo "docs: add cost optimization local verification report"
        ;;
    7ee7a1d*)
        echo "docs: add comprehensive cost optimization guide"
        ;;
    568689b*)
        echo "feat: implement cost optimization plan - CloudFlare free + minimal config"
        ;;
    95edbe0*)
        echo "feat: implement phase 1 production security hardening - JWT auth, WAF protection, budget control"
        ;;
    *)
        cat
        ;;
esac
' HEAD~9..HEAD

