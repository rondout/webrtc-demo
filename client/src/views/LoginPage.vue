<!--
 * @Author: shufei.han
 * @Date: 2024-11-07 16:08:55
 * @LastEditors: shufei.han
 * @LastEditTime: 2024-11-08 18:23:59
 * @FilePath: \webrtc-demo\client\src\views\LoginPage.vue
 * @Description: 
-->
<template>
  <div class="login-container full-height flex">
    <div class="login-content">
      <h2>请登录</h2>
      <Form :model="formState" name="basic" :label-col="{ span: 8 }" :wrapper-col="{ span: 16 }" autocomplete="off"
        @finish="onFinish">
        <FormItem label="Username" name="username"
          :rules="[{ required: true, message: 'Please input your username!' }]">
          <Input v-model:value="formState.username" />
        </FormItem>

        <FormItem label="Password" name="password"
          :rules="[{ required: true, message: 'Please input your password!' }]">
          <InputPassword v-model:value="formState.password" />
        </FormItem>

        <FormItem name="remember" :wrapper-col="{ offset: 8, span: 16 }">
          <Checkbox v-model:checked="formState.remember">Remember me</Checkbox>
        </FormItem>

        <FormItem :wrapper-col="{ offset: 8, span: 16 }">
          <Button :loading="loading" type="primary" html-type="submit">Submit</Button>
        </FormItem>
      </Form>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { useUserAction } from "@/hooks/useUserInfo";
import type { UserInfo } from "@/models/base.model";
import { Button, Checkbox, Form, FormItem, Input, InputPassword } from "ant-design-vue";
import { reactive, ref } from "vue";

const {login, loading} = useUserAction()

interface FormState extends UserInfo {
  remember: boolean;
}

const formState = reactive<FormState>({
  username: "",
  password: "",
  remember: true,
});

const onFinish = async (values: FormState) => {
  const { username, password } = values;
  await login({ username, password });
};
</script>

<style lang="scss" scoped>
.login-content {
  border: 1px solid var(--primary);
  border-radius: 8px;
  padding: 12px;
}
</style>
