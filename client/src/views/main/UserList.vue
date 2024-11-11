<!--
 * @Author: shufei.han
 * @Date: 2024-11-08 18:25:16
 * @LastEditors: shufei.han
 * @LastEditTime: 2024-11-11 14:15:58
 * @FilePath: \webrtc-demo\client\src\views\main\UserList.vue
 * @Description: 
-->
<template>
    <div class="user-list full-height">
        <div class="user-list-header">
            <div class="title">用户列表</div>
        </div>
        <div class="friends-list">
            <div v-for="user of friends" :key="user.username" class="user-item">
                <div class="inner flex-btw">
                    <div class="flex-start">
                        <span class="name">{{ user.username }}</span>
                        <Tag v-if="user.online" color="success">Online</Tag>
                        <Tag v-else color="error">Offline</Tag>
                    </div>
                    <div class="flex-start">
                        <span style="background-color: #fff;border-radius: 4px;">
                            <Button :disabled="!user.online" size="small" @click="handleSelect(user)">联系</Button>
                        </span>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { useUserFriends } from '@/hooks/useUserInfo';
import { type UserInfo } from '@/models/base.model';
import { Button, Tag } from 'ant-design-vue';

const { friends } = useUserFriends()
const emits = defineEmits<{
    (e: 'userSelect',user: string): void
}>()

const handleSelect = (user: UserInfo) => {
    emits('userSelect', user.username)
}

</script>

<style lang="scss" scoped>
.user-list {
    width: 250px;
    border-right: 1px solid var(--primary);

    .user-list-header {
        padding: 12px;

        .title {
            color: var(--primary)
        }

        border-bottom: 1px solid var(--primary);
    }

    .user-item {
        padding: 6px;

        .inner {
            padding: 6px;
            background-color: var(--primary);
            border-radius: 4px;
            color: #fff;

            .name {
                padding-right: 8px;
            }
        }
    }
}
</style>